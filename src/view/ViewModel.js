import { patch } from "./patch";
import { hydrate } from "./hydrate";
import { preProc } from "./preProc";
import { isArr, isPlainObj, isFunc, isProm, cmpArr, cmpObj, assignObj, curry, raft, noop } from "../utils";
import { repaint, isHydrated, getVm } from "./utils";
import { insertBefore, removeChild, nextSib, clearChildren } from "./dom";
import { drainDidHooks, fireHook } from "./hooks";
import { streamVal, streamOn, streamOff } from './addons/stream';
import { syncRedraw } from './config';
import { devNotify, DEVMODE } from "./addons/devmode";
import { DOMInstr } from "./addons/dominstr";

var instr = null;

if (_DEVMODE) {
	if (DEVMODE.mutations) {
		instr = new DOMInstr(true);
	}
}

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

	vm.init && vm.init.call(vm, vm, vm.data, vm.key, opts);
}

export const ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	init:	null,
	view:	null,
	key:	null,
	data:	null,
	state:	null,
	api:	null,
	opts:	null,
	node:	null,
	hooks:	null,
	refs:	null,
	render:	null,

	mount: mount,
	unmount: unmount,
	config: function(opts) {
		var t = this;

		if (opts.init)
			t.init = opts.init;
		if (opts.diff) {
			if (FEAT_DIFF_CMP) {
				if (isFunc(opts.diff)) {
					t.diff = {
						val: opts.diff,
						cmp: function(vm, o, n) {
							var cmpFn = isArr(o) ? cmpArr : cmpObj;
							return !(o === n || cmpFn(o, n));
						}
					};
				}
			}
			else
				t.diff = opts.diff;
		}
		if (FEAT_ONEVENT) {
			if (opts.onevent)
				t.onevent = opts.onevent;
		}

		// maybe invert assignment order?
		if (opts.hooks)
			t.hooks = assignObj(t.hooks || {}, opts.hooks);

		if (FEAT_EMIT) {
			if (opts.onemit)
				t.onemit = assignObj(t.onemit || {}, opts.onemit);
		}
	},
	parent: function() {
		return getVm(this.node.parent);
	},
	root: function() {
		var p = this.node;

		while (p.parent)
			p = p.parent;

		return p.vm;
	},
	redraw: function(sync) {
		var vm = this;

		if (!FEAT_RAF_REDRAW) {
			vm._redraw(null, null, isHydrated(vm));
		}
		else {
			if (sync == null)
				sync = syncRedraw;

			if (sync)
				vm._redraw(null, null, isHydrated(vm));
			else
				(vm._redrawAsync = vm._redrawAsync || raft(_ => vm.redraw(true)))();
		}

		return vm;
	},
	update: function(newData, sync) {
		var vm = this;

		if (!FEAT_RAF_REDRAW) {
			vm._update(newData, null, null, isHydrated(vm));
		}
		else {
			if (sync == null)
				sync = syncRedraw;

			if (sync)
				vm._update(newData, null, null, isHydrated(vm));
			else
				(vm._updateAsync = vm._updateAsync || raft(newData => vm.update(newData, true)))(newData);
		}

		return vm;
	},

	_update: updateSync,
	_redraw: redrawSync,
};

if (FEAT_RAF_REDRAW) {
	ViewModelProto._redrawAsync = ViewModelProto._updateAsync = null;
}

if (FEAT_ONEVENT) {
	ViewModelProto.onevent = noop;
}

function mount(el, isRoot) {
	var vm = this;

	if (_DEVMODE) {
		if (DEVMODE.mutations)
			instr.start();
	}

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
			insertBefore(el, vm.node.el);
	}

	if (el)
		drainDidHooks(vm);

	if (_DEVMODE) {
		if (DEVMODE.mutations)
			console.log(instr.end());
	}

	return vm;
}

// asSub means this was called from a sub-routine, so don't drain did* hook queue
function unmount(asSub) {
	var vm = this;

	if (FEAT_STREAM) {
		streamOff(vm._stream);
		vm._stream = null;
	}

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	node.el = null;

	if (!asSub)
		drainDidHooks(vm);
}

function reParent(vm, vold, newParent, newIdx) {
	if (newParent != null) {
		newParent.body[newIdx] = vold;
		vold.idx = newIdx;
		vold.parent = newParent;
		vold._lis = false;
	}
	return vm;
}

function redrawSync(newParent, newIdx, withDOM) {
	const isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

	if (_DEVMODE) {
		// was mounted (has node and el), but el no longer has parent (unmounted)
		if (isRedrawRoot && vm.node && vm.node.el && !vm.node.el.parentNode)
			devNotify("UNMOUNTED_REDRAW", [vm]);

		if (isRedrawRoot && DEVMODE.mutations && isMounted)
			instr.start();
	}

	var doDiff = vm.diff != null,
		vold = vm.node,
		oldDiff,
		newDiff;

	if (doDiff) {
		newDiff = vm.diff.val(vm, vm.data);

		if (vold != null) {
			oldDiff = vold._diff;
            if (!vm.diff.cmp(vm, oldDiff, newDiff))
                return reParent(vm, vold, newParent, newIdx);
		}
	}

	isMounted && fireHook(vm.hooks, "willRedraw", vm, vm.data);

	var vnew = vm.render.call(vm, vm, vm.data, oldDiff, newDiff);

	if (doDiff)
		vnew._diff = newDiff;

	if (vnew === vold)
		return reParent(vm, vold, newParent, newIdx);

	// todo: test result of willRedraw hooks before clearing refs
	vm.refs = null;

	// always assign vm key to root vnode (this is a de-opt)
	if (vm.key != null && vnew.key !== vm.key)
		vnew.key = vm.key;

	vm.node = vnew;

	if (FEAT_STREAM) {
		vm._stream = [];
	}

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm);
		newParent.body[newIdx] = vnew;
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
			if (vold.tag !== vnew.tag || vold.key !== vnew.key) {
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

	if (FEAT_STREAM) {
		streamVal(vm.data, vm._stream);
		vm._stream = streamOn(vm._stream, vm);
	}

	isMounted && fireHook(vm.hooks, "didRedraw", vm, vm.data);

	if (isRedrawRoot && isMounted)
		drainDidHooks(vm);

	if (_DEVMODE) {
		if (isRedrawRoot && DEVMODE.mutations && isMounted)
			console.log(instr.end());
	}

	return vm;
}

// this also doubles as moveTo
// TODO? @withRedraw (prevent redraw from firing)
function updateSync(newData, newParent, newIdx, withDOM) {
	var vm = this;

	if (newData != null) {
		if (vm.data !== newData) {
			if (_DEVMODE) {
				devNotify("DATA_REPLACED", [vm, vm.data, newData]);
			}
			fireHook(vm.hooks, "willUpdate", vm, newData);
			vm.data = newData;
		}
	}

	return vm._redraw(newParent, newIdx, withDOM);
}