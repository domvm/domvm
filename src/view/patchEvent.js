import { isArr, isFunc } from '../utils';
import { getVm, getVnode } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function handle(evt) {
	let elm = evt.currentTarget,
		dfn = elm._node.attrs["on" + evt.type];

	if (isArr(dfn)) {
		let fn = dfn[0], args = dfn.slice(1);
		let node = getVnode(evt.target),
			vm = getVm(node),
			dvmargs = [evt, node, vm, vm.data],
			out1 = fn.apply(elm, args.concat(dvmargs)),
			out2,
			out3;

		if (FEAT_ONEVENT) {
			out2 = vm.onevent(evt, node, vm, vm.data, args),
			out3 =    onevent(evt, node, vm, vm.data, args);
		}

		if (out1 === false || out2 === false || out3 === false)
			evt.preventDefault();
	}
	else
		dfn.call(elm, evt);
}

export function patchEvent(node, name, nval, oval) {
	if (nval == oval)
		return;

	if (_DEVMODE) {
		if (nval != null && !isFunc(nval) && !isArr(nval))
			devNotify("INVALID_HANDLER", [node, nval]);

		if (isFunc(nval) && nval.name == '')
			devNotify("INLINE_HANDLER", [node, nval]);
	}

	let el = node.el;

	if (nval == null)
		el.removeEventListener(name.slice(2), handle);
	else if (oval == null)
		el.addEventListener(name.slice(2), handle);
}