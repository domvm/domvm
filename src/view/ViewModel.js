import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr, isPlainObj, isFunc, isProm, cmpArr, cmpObj, assignObj, curry, raft } from "../utils";
import { repaint } from "./utils";
import { insertBefore, removeChild, nextSib } from "./dom";
import { didQueue, fireHooks } from "./hooks";

// global id counter
let vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
export const views = {};

export function ViewModel(view, model, key, opts) {			// parent, idx, parentVm
	var id = vmid++;

	var vm = this;

	vm.api = {};

	vm.id = id;
	vm.view = view;
	vm.model = model;
	vm.key = key == null ? model : key;

	var out = view.call(vm.api, vm, model, key);			// , opts

	if (isFunc(out))
		vm.render = out;
	else {
		if (out.diff) {
			vm.diff(out.diff);
			delete out.diff;
		}

		assignObj(vm, out);
	}

	views[id] = vm;

	// remove this?
	if (opts) {
		vm.opts = opts;

		if (opts.hooks)
			vm.hook(opts.hooks);
	//	if (opts.diff)
	//		this.diff(opts.diff);
	}

	// these must be created here since debounced per view
	vm._redrawAsync = raft(_ => vm._redraw());
	vm._updateAsync = raft(newModel => vm._update(newModel));

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

export const ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	id: null,

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
		var p = this.node;

		while (p = p.parent) {
			if (p.vmid != null)
				return views[p.vmid];
		}

		return null;
	},

	root: function() {
		var p = this.node;

		while (p.parent)
			p = p.parent;

		return views[p.vmid];
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

//	hooks: function(hooks) {},
	hook: function(hooks) {
		this.hooks = hooks;
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

/*
export function cleanExposedRefs(orefs, nrefs) {
	for (var key in orefs) {
		// ref not present in new refs
		if (nrefs == null || !(key in nrefs)) {
			var val = orefs[key];


//			var path = [];
//			// dig nown if val i a namespace
//			while (isPlainObj(val) && val.type == null) {
//				path.push(val);
//				val =
//			}


			if (isPlainObj(val)) {
				// is a vnode
				if (val.type) {
					// is an exposed ref
					if (val.ref[0] == "^") {
						console.log("clean parents of absent exposed ref");
					}
				}
				// is namespace, dig down
				else {

				}
			}
		}
	}
}
*/

function mount(el, isRoot) {		// , asSub, refEl
	var vm = this;

	if (isRoot) {
		while (el.firstChild)
			el.removeChild(el.firstChild);

		this._redraw(null, null, false);
		hydrate(this.node, el);
	}
	else {
		this._redraw(null, null);

		if (el)
			insertBefore(el, this.node.el);			// el.appendChild(this.node.el);
	}

	if (el)
		drainDidHooks(this);

	return this;
}

// asSub = true means this was called from a sub-routine, so don't drain did* hook queue
// immediate = true means did* hook will not be queued (usually cause this is a promise resolution)
function unmount(asSub) {
	var vm = this;

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	views[vm.id] = null;

//	vm.hooks && fireHooks("didUnmount", vm, null, immediate);

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

	var vold = vm.node;

	// no diff, just re-parent old
	if (isMounted && vm._diff != null && vm._diff()) {
		// will doing this outside of preproc cause de-opt, add shallow opt to preproc?
		if (vold && newParent) {
			newParent.body[newIdx] = vold;
			vold.parent = newParent;
		}
		return vm;
	}

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs) {
	//	var orefs = vm.refs;
		vm.refs = null;
	}

	var vnew = vm.render.call(vm.api, vm, vm.model, vm.key);		// vm.opts

//	console.log(vm.key);

	vm.node = vnew;

//	vm.node = vnew;
//	vnew.vm = vm;			// this causes a perf drop 1.53ms -> 1.62ms			how important is this?
//	vnew.vmid = vm.id;

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm.id, vm.key);
		newParent.body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold.parent) {
		preProc(vnew, vold.parent, vold.idx, vm.id, vm.key);
		vold.parent.body[vold.idx] = vnew;
	}
	else
		preProc(vnew, null, null, vm.id, vm.key);

	// after preproc re-populates new refs find any exposed refs in old
	// that are not also in new and unset from all parents
	// only do for redraw roots since refs are reset at all redraw levels
//	if (isRedrawRoot && orefs)
//		cleanExposedRefs(orefs, vnew.refs);

	if (withDOM !== false) {
		if (vold) {
			// root node replacement
			if (vold.tag !== vnew.tag) {
				var parEl = vold.el.parentNode;
				var refEl = nextSib(vold.el);
				removeChild(parEl, vold.el);
				insertBefore(parEl, hydrate(vnew), refEl);
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