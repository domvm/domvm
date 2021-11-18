import { isArr, isFunc } from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

// invokes parameterized events
function exec(fn, args, e, node) {
	let vm = getVm(node),
		out1 = fn.apply(vm, args.concat(e, node, vm, vm.data)),
		out2,
		out3;

	if (FEAT_ONEVENT) {
		out2 = vm.onevent(e, node, vm, vm.data, args),
		out3 =    onevent(e, node, vm, vm.data, args);
	}

	if (out1 === false || out2 === false || out3 === false)
		e.preventDefault();
}

function handle(e) {
	let curTarg = e.currentTarget;
	let node = curTarg._node;

	if (node == null)
		return;

	let dfn = node.attrs["on" + e.type];

	if (isArr(dfn))
		exec(dfn[0], dfn.slice(1), e, node);
	else
		dfn.call(curTarg, e);
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
		el[name] = null;
	else if (oval == null)
		el[name] = handle;
}