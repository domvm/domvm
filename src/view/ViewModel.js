import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr, isPlainObj, isFunc, isProm, cmpArr, cmpObj, assignObj, curry, raft } from "../utils";
import { repaint, getVm } from "./utils";
import { insertBefore, removeChild, nextSib, clearChildren } from "./dom";
import { drainDidHooks, fireHook } from "./hooks";
import { devNotify } from "./addons/devmode";

// view + key serve as the vm's unique identity
export function ViewModel(view, data, key, opts) {
	var vm = this;

	vm.view = view;
	vm.data = data;
	vm.key = key;

	if (opts) {
		vm.opts = opts;
		vm.config(opts);
	}

	var out = isPlainObj(view) ? view : view.call(vm, vm, data, key, opts);

	if (isFunc(out))
		vm.render = out;
	else {
		vm.render = out.render;
		vm.config(out);
	}

	// these must be wrapped here since they're debounced per view
	vm._redrawAsync = raft(_ => vm._redraw());
	vm._updateAsync = raft(newData => vm._update(newData));

	vm.init && vm.init(vm, vm, data, key, opts);
}

export const ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	init: null,
	view: null,
	key: null,
	data: null,
	opts: null,
	node: null,
	hooks: null,
	render: null,

	// diff cache
	_diff: null,

	config: function(opts) {
		if (opts.init)
			this.init = opts.init;
		if (opts.diff)
			this.diff = opts.diff;
		if (opts.hooks)
			this.hooks = assignObj(this.hooks || {}, opts.hooks);	// maybe invert assignment order?
	},

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
	update: function(newData, sync) {
		var vm = this;
		sync ? vm._update(newData) : vm._updateAsync(newData);
		return vm;
	},

	_update: updateSync,
	_redraw: redrawSync,	// non-coalesced / synchronous
	_redrawAsync: null,		// this is set in constructor per view
	_updateAsync: null,
};

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

function reParent(vm, vold, newParent, newIdx) {
	if (newParent != null) {
		newParent.body[newIdx] = vold;
		vold.idx = newIdx;
		vold.parent = newParent;
	}
	return vm;
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
	const isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

	if (_DEVMODE) {
		// was mounted (has node and el), but el no longer has parent (unmounted)
		if (isRedrawRoot && vm.node && vm.node.el && !vm.node.el.parentNode)
			devNotify("UNMOUNTED_REDRAW", [vm]);
	}

	var vold = vm.node, oldDiff, newDiff;

	if (vm.diff != null) {
		oldDiff = vm._diff;
		vm._diff = newDiff = vm.diff(vm, vm.data);

		if (vold != null) {
			var cmpFn = isArr(oldDiff) ? cmpArr : cmpObj;
			var isSame = oldDiff === newDiff || cmpFn(oldDiff, newDiff);

			if (isSame)
				return reParent(vm, vold, newParent, newIdx);
		}
	}

	isMounted && vm.hooks && fireHook("willRedraw", vm, vm.data);

	// TODO: allow returning vm.node as no-change indicator
	var vnew = vm.render.call(vm, vm, vm.data, oldDiff, newDiff);

	// isSame
	if (vnew === vold)
		return reParent(vm, vold, newParent, newIdx);

	// todo: test result of willRedraw hooks before clearing refs
	vm.refs = null;

	// always assign vm key to root vnode (this is a de-opt)
	if (vm.key != null && vnew.key !== vm.key)
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
				patch(vnew, vold);
		}
		else
			hydrate(vnew);
	}

	isMounted && vm.hooks && fireHook("didRedraw", vm, vm.data);

	if (isRedrawRoot && isMounted)
		drainDidHooks(vm);

	return vm;
}

// withRedraw?
// this doubles as moveTo
// will/didUpdate
function updateSync(newData, newParent, newIdx, withDOM) {			// parentVm
	var vm = this;

	if (newData != null) {
		if (vm.data !== newData) {
			vm.hooks && fireHook("willUpdate", vm, newData);		// willUpdate will be called ahead of willRedraw when data will be replaced
			vm.data = newData;
		//	vm.hooks && fireHook("didUpdate", vm, newData);		// should this fire at al?
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