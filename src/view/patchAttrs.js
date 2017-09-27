import { isStyleProp, isSplProp, isEvProp, isDynProp, getVm } from './utils';
import { isFunc, emptyObj } from '../utils';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';
import { isStream, hookStream } from './addons/stream';
import { devNotify } from "./addons/devmode";

export function remAttr(node, name, asProp) {
	if (name[0] === ".") {
		name = name.substr(1);
		asProp = true;
	}

	if (asProp)
		node.el[name] = "";
	else
		node.el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
export function setAttr(node, name, val, asProp, initial) {
	var el = node.el;

	if (val == null)
		!initial && remAttr(node, name, false);		// will also removeAttr of style: null
	else if (name === "class")
		el.className = val;
	else if (name === "id" || typeof val === "boolean" || asProp)
		el[name] = val;
	else if (name[0] === ".")
		el[name.substr(1)] = val;
	else
		el.setAttribute(name, val);
}

export function patchAttrs(vnode, donor, initial) {
	const nattrs = vnode.attrs || emptyObj;
	const oattrs = donor.attrs || emptyObj;

	if (nattrs === oattrs) {
		if (_DEVMODE)
			devNotify("REUSED_ATTRS", [vnode]);
	}
	else {
		for (var key in nattrs) {
			var nval = nattrs[key];
			var isDyn = isDynProp(vnode.tag, key);
			var oval = isDyn ? vnode.el[key] : oattrs[key];

			if (FEAT_STREAM) {
				if (isStream(nval))
					nattrs[key] = nval = hookStream(nval, getVm(vnode));
			}

			if (nval === oval) {}
			else if (isStyleProp(key))
				patchStyle(vnode, donor);
			else if (isSplProp(key)) {}
			else if (isEvProp(key))
				patchEvent(vnode, key, nval, oval);
			else
				setAttr(vnode, key, nval, isDyn, initial);
		}

		// TODO: bench style.cssText = "" vs removeAttribute("style")
		for (var key in oattrs) {
			!(key in nattrs) &&
			!isSplProp(key) &&
			remAttr(vnode, key, isDynProp(vnode.tag, key) || isEvProp(key));
		}
	}
}