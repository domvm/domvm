import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr } from "../utils";
import { views } from "./createView";

export function ViewModel(id, view, model, key, opts) {			// parent, idx, parentVm
	this._id = id;
	this._view = view;
	this._model = model;
	this._key = key == null ? model : key;
	this._render = view(this, model, key);			// , opts

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

ViewModel.prototype = {
	constructor: ViewModel,

	_id: null,

	// view + key serve as the vm's unique identity
	_view: null,
	_key: null,
	_model: null,
	_node: null,
	_diff: null,
	_diffLast: null,	// prior array of diff values
	_hooks: null,
	_render: null,

//	_setRef: function() {},

	// parent vm and initial vm descendents
//	_parent: null,
//	_body: null,

	// as plugins?
	get _parent() {
		var p = this._node;

		while (p = p._parent) {
			if (p._vmid != null)
				return views[p._vmid];
		}

		return null;
	},
	get _body() {
		return nextSubVms(this._node, []);
	},

//	api: null,
	refs: null,
	update: updateAsync,
	_update: updateSync,
	attach: attach,
	mount: mount,
	redraw: redrawAsync,			// should handle ancest level, raf-debounced, same with update
	_redraw: redrawSync,		// non-coalesced / synchronous
	/*
	function(ancest) {
	//	var vm = this;
	//	return !ancest : redraw.call(vm) vm._parent ? vm._parent.redraw(ancest - 1);
	},
	*/
	diff: function(diff) {},
	hooks: function(hooks) {},
};

function nextSubVms(n, accum) {
	var body = n._body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2._vmid != null)
				accum.push(views[n2._vmid]);
			else
				nextSubVms(n2, accum);
		}
	}

	return accum;
}

function attach(el) {
}

// TODO: mount be made async?
function mount(el, isRoot) {
	if (el == null)
		this._redraw();
	else if (isRoot) {
		while (el.firstChild)
			el.removeChild(el.firstChild);

		this._redraw(null, null, false);
		hydrate(this._node, el);
	}
	else {
		this._redraw();
		el.insertBefore(this._node._el, null);		// el.appendChild(this._node._el);
	}

	return this;
}

// this must be per view debounced, so should be wrapped in raf per instance
function redrawAsync(level) {
	level = level || 0;

	if (level == 0 || this._parent == null)
		this._redraw();							// this should be async also
	else
		this._parent.redraw(level - 1);

	return this;
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
//	let isRedrawRoot = newParent != null;
	var vm = this;

//	if (vm._diff && vm._diff(model))

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs)
		vm.refs = null;

	var vold = vm._node;
	var vnew = vm._render(vm, vm._model, vm._key);		// vm._opts

	preProc(vnew, null, null, vm._id);	// , vm._id

	vm._node = vnew;
//	vnew._vm = vm;			// this causes a perf drop 1.53ms -> 1.62ms			how important is this?
	vnew._vmid = vm._id;

	if (newParent) {
		vnew._idx = newIdx;
		vnew._parent = newParent;
		newParent._body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold._parent) {
		vnew._idx = vold._idx;
		vnew._parent = vold._parent;
		vold._parent._body[vold._idx] = vnew;
	}

	if (withDOM !== false) {
		if (vold)
			patch(vnew, vold);
		else
			hydrate(vnew);
	}

	return vm;
}

// withRedraw?
// this doubles as moveTo
// will/didUpdate
function updateSync(newModel, newParent, newIdx, withDOM) {			// parentVm
	var vm = this;

	if (newModel != null)				// && vm._key !== vm._model
		vm._model = newModel;

	return vm._redraw(newParent, newIdx, withDOM);
/*
	if (parentVm != null) {
		vm._parent = parentVm;
		parentVm._body.push(vm);
	}
*/
}

// withRedraw?
function updateAsync(newModel) {
	return this._update(newModel);
}