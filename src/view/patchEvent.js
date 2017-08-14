import { isArr, isFunc, isPlainObj } from '../utils';
import { closestVNode } from './dom';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function bindEv(el, type, fn) {
	el[type] = fn;
}

function exec(fn, args, e, node, vm) {
	var out = fn.apply(vm, args.concat([e, node, vm, vm.data]));

	// should these respect out === false?
	vm.onevent(e, node, vm, vm.data, args);
	onevent.call(null, e, node, vm, vm.data, args);

	if (out === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function handle(e) {
	var node = closestVNode(e.target);
	var vm = getVm(node);

	var evDef = e.currentTarget._node.attrs["on" + e.type], fn, args;

	if (isArr(evDef)) {
		fn = evDef[0];
		args = evDef.slice(1);
		exec(fn, args, e, node, vm);
	}
	else {
		for (var sel in evDef) {
			if (e.target.matches(sel)) {
				var evDef2 = evDef[sel];

				if (isArr(evDef2)) {
					fn = evDef2[0];
					args = evDef2.slice(1);
				}
				else {
					fn = evDef2;
					args = [];
				}

				exec(fn, args, e, node, vm);
			}
		}
	}
}

export function patchEvent(node, name, nval, oval) {
	if (nval === oval)
		return;

	if (_DEVMODE) {
		if (isFunc(nval) && isFunc(oval) && oval.name == nval.name)
			devNotify("INLINE_HANDLER", [node, oval, nval]);

		if (oval != null && nval != null &&
			(
				isArr(oval) != isArr(nval) ||
				isPlainObj(oval) != isPlainObj(nval) ||
				isFunc(oval) != isFunc(nval)
			)
		) devNotify("MISMATCHED_HANDLER", [node, oval, nval]);
	}

	var el = node.el;

	if (nval == null || isFunc(nval))
		bindEv(el, name, nval);
	else if (oval == null)
		bindEv(el, name, handle);
}