import { isArr, isFunc } from '../utils';
import { getVm, getVnode } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

// invokes parameterized events
function exec(fn, args, evt) {
	let node = getVnode(evt.target),
        vm = getVm(node),
		out1 = fn.apply(evt.currentTarget, args.concat(evt, node, vm, vm.data)),
        out2,
        out3;

    if (FEAT_ONEVENT) {
		out2 = vm.onevent(evt, node, vm, vm.data, args),
		out3 =    onevent(evt, node, vm, vm.data, args);
    }

    if (out1 === false || out2 === false || out3 === false)
		evt.preventDefault();
}

function handle(evt) {
    let elm = evt.currentTarget,
        dfn = elm._node.attrs["on" + evt.type];

    if (isArr(dfn))
        exec(dfn[0], dfn.slice(1), evt);
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
        el[name] = null;
    else if (oval == null)
        el[name] = handle;
}