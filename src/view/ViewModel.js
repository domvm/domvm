import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr, cmpArr } from "../utils";
import { repaint } from "./utils";
import { didQueue, insertBefore, removeChild, fireHooks } from "./syncChildren";

// global id counter
let vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
export const views = {};

export function ViewModel(view, model, key, opts) {			// parent, idx, parentVm
	var id = vmid++;

	this.id = id;
	this.view = view;
	this.model = model;
	this.key = key == null ? model : key;
	this.render = view(this, model, key);			// , opts

	views[id] = this;

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

ViewModel.prototype = {
	constructor: ViewModel,

	id: null,

	// view + key serve as the vm's unique identity
	view: null,
	key: null,
	model: null,
	node: null,
//	diff: null,
	diffLast: null,	// prior array of diff values
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

	body: function() {
		return nextSubVms(this.node, []);
	},

	root: function() {
		var p = this.node;

		while (p.parent)
			p = p.parent;

		return views[p.vmid];
	},

//	api: null,
	refs: null,
	update: updateAsync,
	attach: attach,
	mount: mount,
	unmount: unmount,
	redraw: redrawAsync,		// should handle raf-debounced, same with update

	_update: updateSync,
	_redraw: redrawSync,		// non-coalesced / synchronous

	_diff: null,
	_diffArr: [],
	/*
	function(ancest) {
	//	var vm = this;
	//	return !ancest : redraw.call(vm) vm.parent ? vm.parent.redraw(ancest - 1);
	},
	*/
	diff: function(diff) {
		var vm = this;
		this._diff = function(model) {
			var diffArr = diff(model);

			if (!cmpArr(diffArr, vm._diffArr)) {
				vm._diffArr = diffArr;
				return false;
			}
			return true;
		};
	},
//	hooks: function(hooks) {},
	hook: function(hooks) {
		this.hooks = hooks;
	},
	events: null,
};

function nextSubVms(n, accum) {
	var body = n.body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2.vmid != null)
				accum.push(views[n2.vmid]);
			else
				nextSubVms(n2, accum);
		}
	}

	return accum;
}

function attach(el) {
}

function drainDidHooks(vm) {
	if (didQueue.length) {
		repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			item[0](item[1], item[2]);
	}
}

// TODO: mount be made async?
function mount(el, isRoot) {
	var vm = this;

	vm.hooks && fireHooks("willMount", vm);

	if (isRoot) {
		while (el.firstChild)
			el.removeChild(el.firstChild);

		this._redraw(null, null, false);
		hydrate(this.node, el);
	}
	else {
		this._redraw();

		if (el)
			insertBefore(el, this.node.el);			// el.appendChild(this.node.el);
	}

	vm.hooks && fireHooks("didMount", vm);

	if (el)
		drainDidHooks(this);

	return this;
}

function unmount() {
	var vm = this;

	vm.hooks && fireHooks("willUnmount", vm);

	var node = this.node;
	var parEl = node.el.parentNode;
	removeChild(parEl, node.el);

	vm.hooks && fireHooks("didUnmount", vm);

	drainDidHooks(this);
}

// this must be per view debounced, so should be wrapped in raf per instance
function redrawAsync() {
	return this._redraw();
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
	if (vm._diff != null && vm._diff(vm.model)) {
		// will doing this outside of preproc cause de-opt, add shallow opt to preproc?
		if (vold) {
			newParent.body[newIdx] = vold;
			vold.parent = newParent;
		}
		return vm;
	}

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs)
		vm.refs = null;


	var vnew = vm.render(vm, vm.model, vm.key);		// vm.opts

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

	if (withDOM !== false) {
		if (vold) {
			// root node replacement
			if (vold.tag !== vnew.tag) {
				var parEl = vold.el.parentNode;
				removeChild(parEl, vold.el);
				insertBefore(parEl, hydrate(vnew));
			}
			else
				patch(vnew, vold);
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

// withRedraw?
function updateAsync(newModel) {
	return this._update(newModel);
}