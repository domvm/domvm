import { isArr, isFunc, isPlainObj, doc} from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

const registry = {};

function listen(ontype) {
	if (registry[ontype]) return;
	registry[ontype] = true;
	bind(doc, ontype, handle, true);
}

/*
function unlisten(ontype) {
	if (registry[ontype])
		doc.removeEventListener(ontype.slice(2), handle, USE_CAPTURE);
}
*/

function unbind(el, type, fn, capt) {
	el.removeEventListener(type.slice(2), fn, capt);
}

function bind(el, type, fn, capt) {
	el.addEventListener(type.slice(2), fn, capt);
}

function exec(fn, args, e, node, vm) {
	var out1 = fn.apply(vm, args.concat([e, node, vm, vm.data])), out2, out3;

	if (FEAT_ONEVENT) {
		out2 = vm.onevent(e, node, vm, vm.data, args),
		out3 = onevent.call(null, e, node, vm, vm.data, args);
	}

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function closestEvDef(type, node) {
	var ontype = "on" + type, evDef, attrs;

	while (node) {
		if (attrs = node.attrs) {
			if ((evDef = attrs[ontype]) && isArr(evDef))
				return evDef;
		}
		node = node.parent;
	}

	return null;
}

function handle(e) {
	var node = e.target._node;

	if (node == null)
		return;

	var evDef = closestEvDef(e.type, node), fn, args;

	evDef && exec(evDef[0], evDef.slice(1), e, node, getVm(node));
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

	if (isFunc(nval))
		bind(el, name, nval, false);
	else if (nval != null)
		listen(name);

	if (isFunc(oval))
		unbind(el, name, oval, false);
}