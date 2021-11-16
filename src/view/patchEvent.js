import { isArr, isFunc, isPlainObj, doc} from '../utils';
import { getVm } from './utils';
import { onevent } from './config';
import { devNotify } from "./addons/devmode";

function unbind(el, type, fn, capt) {
	el.removeEventListener(type.slice(2), fn, capt);
}

function bind(el, type, fn, capt) {
	el.addEventListener(type.slice(2), fn, capt);
}

function exec(fn, args, evt, evtnod, hdlnod) {
    var vm   = getVm(hdlnod);
	var out1 = fn.apply(vm, args.concat([evt, evtnod, vm, vm.data])), out2, out3;

	if (FEAT_ONEVENT) {
		out2 = vm.onevent(evt, evtnod, vm, vm.data, args),
		out3 = onevent.call(null, evt, evtnod, vm, vm.data, args);
	}

	if (out1 === false || out2 === false || out3 === false) {
		evt.preventDefault();
		return false;
	}
}

function ancestEvDefs(type, node) {
	var ontype = "on" + type, evDef, attrs, evDefs = [];

	while (node) {
		if (attrs = node.attrs) {
			if ((evDef = attrs[ontype]) && isArr(evDef))
				evDefs.push({ def: evDef, node: node });
		}
        if(node.vm == null) { break; }                                                                                  // stop at vm
		node = node.parent;
	}

	return evDefs;
}

function handle(e) {
	var node = e.target._node;

	if (node == null)
		return;

	var evDefs = ancestEvDefs(e.type, node);

	for (var i = 0; i < evDefs.length; i++) {
        var evd = evDefs[i];
		var res = exec(evd.def[0], evd.def.slice(1), e, node, evd.node);

		if (res === false)
			break;
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

	if (isFunc(nval))
		bind(el, name, nval, false);
	else if (nval != null) {
		let vmel = getVm(node).node.el;
        if (!vmel._flag) { vmel._flag = {}; }
    	if (!vmel._flag[name]) {
        	vmel._flag[name] = true;
        	bind(vmel, name, handle, false);
        }
    }

	if (isFunc(oval))
		unbind(el, name, oval, false);
}