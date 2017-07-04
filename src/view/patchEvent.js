import { isArr, isFunc, cmpArr } from '../utils';
import { closestVNode } from './dom';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function bindEv(el, type, fn) {
//	DEBUG && console.log("addEventListener");
	el[type] = fn;
}

function handle(e, fn, args) {
	var node = closestVNode(e.target);
	var vm = getVm(node);
	var out = fn.apply(null, args.concat([e, node, vm, vm.data]));
	onevent.call(null, e, node, vm, vm.data, args);

	if (out === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function wrapHandler(fn, args) {
//	console.log("wrapHandler");

	return function wrap(e) {
		handle(e, fn, args);
	};
}

// delagated handlers {".moo": [fn, a, b]}, {".moo": fn}
function wrapHandlers(hash) {
//	console.log("wrapHandlers");

	return function wrap(e) {
		for (var sel in hash) {
			if (e.target.matches(sel)) {
				var hnd = hash[sel];
				var isarr = isArr(hnd);
				var fn = isarr ? hnd[0] : hnd;
				var args = isarr ? hnd.slice(1) : [];

				handle(e, fn, args);
			}
		}
	}
}

// could merge with on*

export function patchEvent(node, name, nval, oval) {
	if (nval === oval)
		return;

	var el = node.el;

	if (nval._raw) {
		bindEv(el, name, nval);
		return;
	}

	if (_DEVMODE) {
		if (isFunc(nval) && isFunc(oval) && oval.name == nval.name)
			devNotify("INLINE_HANDLER", [node, oval, nval]);
	}

	// param'd eg onclick: [myFn, 1, 2, 3...]
	if (isArr(nval)) {
		if (_DEVMODE) {
			if (oval != null && !isArr(oval))
				devNotify("MISMATCHED_HANDLER", [node, oval, nval]);
		}
		var diff = oval == null || !cmpArr(nval, oval);
		diff && bindEv(el, name, wrapHandler(nval[0], nval.slice(1)));
	}
	// basic onclick: myFn (or extracted)
	else if (isFunc(nval)) {
		if (_DEVMODE) {
			if (oval != null && !isFunc(oval))
				devNotify("MISMATCHED_HANDLER", [node, oval, nval]);
		}
		bindEv(el, name, wrapHandler(nval, []));
	}
	// delegated onclick: {".sel": myFn} & onclick: {".sel": [myFn, 1, 2, 3]}
	else		// isPlainObj, TODO:, diff with old/clean
		bindEv(el, name, wrapHandlers(nval));
}