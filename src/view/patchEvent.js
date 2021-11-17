import { isArr, isFunc, isPlainObj, doc} from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function exec(fn, args, e, node) {
    var vm = getVm(node)
    ,   dvmargs = [e, node, vm, vm.data]
    ,   evtargs
	,   out1 = fn.apply(vm, args.concat(dvmargs))
    ,   out2, out3;

	if (FEAT_ONEVENT) {
        evtargs = dvmargs.concat(args);
		out2 = vm.onevent.apply(vm,evtargs),
		out3 = onevent.apply(null,evtargs);
	}

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		return false;
	}
}

function handle(e) {
	var node = e.currentTarget._node;

	if (node == null)
        return;

    var dfn = node.attrs["on"+e.type]

	if (isFunc(dfn)) exec(dfn   ,[]          ,e,node);
    else             exec(dfn[0],dfn.slice(1),e,node);
}

export function patchEvent(node, name, nval, oval) {
	if (nval == oval)
		return;

	if (_DEVMODE) {
		if (nval !=null && !isFunc(nval) && !isArr(nval))
			devNotify("INVALID_HANDLER", [node, nval]);
		if (isFunc(nval) && isFunc(oval) && oval.name == nval.name)
			devNotify("INLINE_HANDLER", [node, oval, nval]);
	}

	var el = node.el;

	if (nval != null)
        el[name] = handle;
	else if(oval != null)
		el[name] = null;
}