import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr, isPlainObj, isFunc, isProm, cmpArr, cmpObj, assignObj, curry, raft } from "../utils";
import { repaint, getVm } from "./utils";
import { insertBefore, removeChild, nextSib, clearChildren } from "./dom";
import { didQueue, fireHooks } from "./hooks";

export function ViewModel(view, model, key, opts) {			// parent, idx, parentVm
	var vm = this;

	vm.view = view;
	vm.model = model;
	vm.key = key == null ? model : key;

	if (DEVMODE) {
		if (model != null && model === key) {
			setTimeout(function() {
				var msg = "A view has been auto-keyed by a provided model's identity: If this model is replaced between redraws,"
					+ " this view will unmount, its internal state and DOM will be destroyed and recreated."
					+ " Consider providing a fixed key to this view to ensure its persistence & fast DOM recycling.";
				console.warn(msg, vm, model);
			}, 100);
		}
	}

	if (!view.prototype._isClass) {
		var out = view.call(vm, vm, model, key, opts);

		if (isFunc(out))
			vm.render = out;
		else {
			if (out.diff) {
				vm.diff(out.diff);
				delete out.diff;
			}

			assignObj(vm, out);
		}
	}
	else {
	//	handle .diff re-definiton
		var vdiff = vm.diff;

		if (vdiff != null && vdiff !== ViewModelProto.diff) {
			vm.diff = ViewModelProto.diff.bind(vm);
			vm.diff(vdiff);
		}
	}

	// remove this?
	if (opts) {
		vm.opts = opts;

		if (opts.hooks)
			vm.hook(opts.hooks);
		if (opts.diff)
			vm.diff(opts.diff);
	}

	// these must be created here since debounced per view
	vm._redrawAsync = raft(_ => vm._redraw());
	vm._updateAsync = raft(newModel => vm._update(newModel));

	var hooks = vm.hooks;

	if (hooks && hooks.didInit)
		hooks.didInit.call(vm, vm, model, key, opts);

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

export const ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	_isClass: false,

	// view + key serve as the vm's unique identity
	view: null,
	key: null,
	model: null,
	opts: null,
	node: null,
//	diff: null,
//	diffLast: null,	// prior array of diff values
	hooks: null,
	render: null,

//	_setRef: function() {},

	// as plugins?
	parent: function() {
		return getVm(this.node.parent);
	},

	root: function() {
		var p = this.node;

		while (p.parent)
			p = p.parent;

		return p.vm;
	},

	api: null,
	refs: null,
	mount: mount,
	unmount: unmount,
	redraw: function(sync) {
		var vm = this;
		sync ? vm._redraw() : vm._redrawAsync();
		return vm;
	},
	update: function(newModel, sync) {
		var vm = this;
		sync ? vm._update(newModel) : vm._updateAsync(newModel);
		return vm;
	},

	_update: updateSync,
	_redraw: redrawSync,	// non-coalesced / synchronous
	_redrawAsync: null,		// this is set in constructor per view
	_updateAsync: null,

	hook: function(hooks) {
		this.hooks = this.hooks || assignObj({}, this.hooks, hooks);
	},
};


export function drainDidHooks(vm) {
	if (didQueue.length) {
		repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			item[0](item[1], item[2]);
	}
}

/*
function isEmptyObj(o) {
	for (var k in o)
		return false;
	return true;
}
*/

function mount(el, isRoot) {		// , asSub, refEl
	var vm = this;

	if (isRoot) {
		clearChildren({el: el, flags: 0});

		vm._redraw(null, null, false);

		// if placeholder node doesnt match root tag
		if (el.nodeName.toLowerCase() !== vm.node.tag) {
			hydrate(vm.node);
			insertBefore(el.parentNode, vm.node.el, el);
			el.parentNode.removeChild(el);
		}
		else
			insertBefore(el.parentNode, hydrate(vm.node, el), el);
	}
	else {
		vm._redraw(null, null);

		if (el)
			insertBefore(el, vm.node.el);			// el.appendChild(vm.node.el);
	}

	if (el)
		drainDidHooks(vm);

	return vm;
}

// asSub = true means this was called from a sub-routine, so don't drain did* hook queue
// immediate = true means did* hook will not be queued (usually cause this is a promise resolution)
function unmount(asSub) {
	var vm = this;

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	if (!asSub)
		drainDidHooks(vm);
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
	const isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

	if (DEVMODE) {
		// was mounted (has node and el), but el no longer has parent (unmounted)
		if (isRedrawRoot && vm.node && vm.node.el && !vm.node.el.parentNode) {
			setTimeout(function() {
				console.warn("Cannot manually .redraw() an unmounted view!", vm);
			}, 100);
		}
	}

	var vold = vm.node;

	// no diff, just re-parent old
	// TODO: allow returning vm.node as no-change indicator
	if (isMounted && vm._diff != null && vm._diff()) {
		// will doing this outside of preproc cause de-opt, add shallow opt to preproc?
		if (vold && newParent) {
			newParent.body[newIdx] = vold;
			vold.idx = newIdx;
			vold.parent = newParent;
		}
		return vm;
	}

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	vm.refs = null;

	var vnew = vm.render.call(vm, vm, vm.model, vm.key);		// vm.opts

	// always assign vm key to root vnode (this is a de-opt)
	if (vm.key !== false && vm.key != null && vnew.key !== vm.key)
		vnew.key = vm.key;

//	console.log(vm.key);

	vm.node = vnew;

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm);
		newParent.body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold.parent) {
		preProc(vnew, vold.parent, vold.idx, vm);
		vold.parent.body[vold.idx] = vnew;
	}
	else
		preProc(vnew, null, null, vm);

	if (withDOM !== false) {
		if (vold) {
			// root node replacement
			if (vold.tag !== vnew.tag) {
				// hack to prevent the replacement from triggering mount/unmount
				vold.vm = vnew.vm = null;

				var parEl = vold.el.parentNode;
				var refEl = nextSib(vold.el);
				removeChild(parEl, vold.el);
				insertBefore(parEl, hydrate(vnew), refEl);

				// another hack that allows any higher-level syncChildren to set
				// reconciliation bounds using a live node
				vold.el = vnew.el;

				// restore
				vnew.vm = vm;
			}
			else
				patch(vnew, vold, isRedrawRoot);
		}
		else
			hydrate(vnew);
	}

	isMounted && vm.hooks && fireHooks("didRedraw", vm);

	if (isRedrawRoot && isMounted)
		drainDidHooks(vm);

	return vm;
}

// withRedraw?
// this doubles as moveTo
// will/didUpdate
function updateSync(newModel, newParent, newIdx, withDOM) {			// parentVm
	var vm = this;

	if (newModel != null) {		// && vm.key !== vm.model
		if (vm.model !== newModel) {
			vm.hooks && fireHooks("willUpdate", vm, newModel);		// willUpdate will be called ahead of willRedraw when model will be replaced
			vm.model = newModel;
		//	vm.hooks && fireHooks("didUpdate", vm, newModel);		// should this fire at al?
		}
	}

	// TODO: prevent redraw from firing?

	return vm._redraw(newParent, newIdx, withDOM);
/*
	if (parentVm != null) {
		vm.parent = parentVm;
		parentVm.body.push(vm);
	}
*/
}