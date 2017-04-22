import { isStyleProp, isSplProp, isEvProp, isDynProp, getVm } from './utils';
import { isFunc, emptyObj } from '../utils';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';
import { isStream, hookStream } from './addons/stubs';

export function remAttr(node, name, asProp) {
	if (asProp)
		node.el[name] = "";
	else
		node.el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
export function setAttr(node, name, val, asProp) {
	var el = node.el;

	if (val == null)
		remAttr(node, name);		//, asProp?  // will also removeAttr of style: null
	else if (node.ns != null)
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

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);
		var oval = isDyn ? vnode.el[key] : oattrs[key];

		if (isStream(nval))
			nattrs[key] = nval = hookStream(nval, getVm(vnode));

		if (nval === oval) {}
		else if (isStyleProp(key))
			patchStyle(vnode, donor);
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key, nval, oval);
		else
			setAttr(vnode, key, nval, isDyn);
	}

	// TODO: handle key[0] === "."
	// should bench style.cssText = "" vs removeAttribute("style")
	for (var key in oattrs) {
		!(key in nattrs) &&
		!isSplProp(key) &&
		remAttr(vnode, key, isDynProp(vnode.tag, key) || isEvProp(key));
	}
}