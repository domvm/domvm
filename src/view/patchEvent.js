import { isArr, isFunc, emptyArr } from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function exec(fn, args, e, node) {
    let vm = getVm(node),
		dvmargs = [e, node, vm, vm.data],
		evtargs,
        out1 = fn.apply(e.currentTarget, args.concat(e, node, vm, vm.data)), // this == currentTarget, NOT vm, to match normal handler
		out2,
		out3;

	if (FEAT_ONEVENT) {
        evtargs = dvmargs.concat(args);
		out2 = vm.onevent.apply(vm, evtargs),
		out3 = onevent.apply(null, evtargs);
	}

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		return false;
	}
}

function handle(e) {
	let node = e.currentTarget._node;

	if (node == null)
        return;

    let dfn = node.attrs["on" + e.type];

	if (isArr(dfn))
		exec(dfn[0], dfn.slice(1), e, node);
    else
		exec(dfn,    emptyArr,     e, node);
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