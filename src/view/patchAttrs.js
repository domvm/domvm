import { isPropAttr, isStyleAttr, isSplAttr, isEvAttr, isDynAttr, getVm } from './utils';
import { isFunc, emptyObj } from '../utils';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';
import { streamVal } from './addons/stream';
import { devNotify } from "./addons/devmode";

export function remAttr(node, name, asProp) {
	if (isPropAttr(name)) {
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
export function setAttr(node, name, val, asProp) {
	var el = node.el;

	if (node.ns != null)
		el.setAttribute(name, val);
	else if (name === "class")
		el.className = val;
	else if (name === "id" || typeof val === "boolean" || asProp)
		el[name] = val;
	else if (name[0] === ".")
		el[name.substr(1)] = val;
	else
		el.setAttribute(name, val);
}

export function patchAttrs(vnode, donor) {
	const nattrs = vnode.attrs || emptyObj;
	const oattrs = donor.attrs || emptyObj;

	if (nattrs === oattrs) {
		if (_DEVMODE)
			devNotify("REUSED_ATTRS", [vnode]);
	}
	else {
		for (var key in nattrs) {
			var nval = nattrs[key];

			if (nval == null)
				continue;

			var isDyn = isDynAttr(vnode.tag, key);
			var oval = isDyn ? vnode.el[key] : oattrs[key];

			if (FEAT_STREAM) {
				nattrs[key] = nval = streamVal(nval, (getVm(vnode) || emptyObj)._stream);
			}

			if (nval === oval) {}
			else if (isStyleAttr(key))
				patchStyle(vnode, donor);
			else if (isSplAttr(key)) {}
			else if (isEvAttr(key))
				patchEvent(vnode, key, nval, oval);
			else
				setAttr(vnode, key, nval, isDyn);
		}

		// TODO: bench style.cssText = "" vs removeAttribute("style")
		for (var key in oattrs) {
			if (nattrs[key] == null) {
				if (isEvAttr(key))
					patchEvent(vnode, key, nattrs[key], oattrs[key]);
				else if (!isSplAttr(key))
					remAttr(vnode, key, isDynAttr(vnode.tag, key));
			}
		}
	}
}