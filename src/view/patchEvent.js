import { isArr, isFunc, isPlainObj } from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function unbind(el, type, fn) {
	el.removeEventListener(type.slice(2), fn, false);
}

function bind(el, type, fn) {
	el.addEventListener(type.slice(2), fn, false);
}

function exec(fn, args, e, node, vm) {
	var out1 = fn.apply(vm, args.concat([e, node, vm, vm.data])),
		out2 = vm.onevent(e, node, vm, vm.data, args),
		out3 = onevent.call(null, e, node, vm, vm.data, args);

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function handle(e) {
	var node = e.target._node;

	if (node == null)
		return;

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
	if (nval == oval)
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

	if (oval == null)
		bind(el, name, isFunc(nval) ? nval : handle);
	else {
		if (nval == null || isFunc(nval))
			unbind(el, name, isFunc(oval) ? oval : handle);
		if (nval != null)
			bind(el, name, isFunc(nval) ? nval : handle);
	}
}