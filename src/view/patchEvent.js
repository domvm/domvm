import { isArr, isFunc, isPlainObj, doc} from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function exec(fn, args, e, evnode, vm) {
    var out1 = fn.apply(vm.currentTarget, args.concat(e, evnode, vm, vm.data)) // this == currentTarget, NOT vm, to match normal handler
    ,   out2, out3;

	if (FEAT_ONEVENT) {
		out2 = vm.onevent(e, evnode, vm, vm.data, args),
		out3 = onevent.call(null,e, evnode, vm, vm.data, args);
	}

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		e.stopPropagation(); // compatibility; this is almost never the right thing to do
		return false;
	}
}

function ancestorNodes(type, node, vm) {
    var nods = [];

    for (; node; node = node.parent) {
        nods.push(node);
        if (node.vm == vm) // stop at view root (all views have their own handler
            break;
        if (node.vm != null) // reset at root of nested view
            nods.length = 0;
    }
    return nods;
}

function handleEvent(e) {
	var evnode = e.target._node

	if (evnode == null) // never?
        return;

    var vm      = e.currentTarget._node.vm
    ,   ontype  = "on"+e.type
    ,   vwnodes = ancestorNodes(e.type,evnode,vm)
    ,   vwnode, attrs, evtdef, hdlres;

    for(var xa = 0, len = vwnodes.length; xa < len; ++xa) {
        vwnode = vwnodes[xa];
        if ((attrs = vwnode.attrs) && (evtdef = attrs[ontype])) {
            vm.currentTarget = vwnode.el;
        	hdlres = (isFunc(evtdef) ? exec(evtdef   ,[]             ,e, evnode, vm)
                                     : exec(evtdef[0],evtdef.slice(1),e, evnode, vm));
            if(hdlres===false || !e.bubbles) { break; } // honor stopPropagation and non-bubbling events
        }
    vm.currentTarget = undefined;
    }
}

export function patchEvent(node, name, nval, oval) {
	if (nval == null)
		return;

	if (_DEVMODE) {
		if (nval !=null && !isFunc(nval) && !isArr(nval))
			devNotify("INVALID_HANDLER", [node, nval]);
		if (isArr(nval) && !isFunc(nval[0]))
			devNotify("INVALID_HANDLER", [node, nval]);
	}

    var vmel = getVm(node).node.el;
	if (!vmel[name]) // assume actually setting this may have hidden overhead; TODO: measure difference without this test
        vmel[name] = handleEvent;
}