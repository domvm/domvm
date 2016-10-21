import { isStyleProp, isSplProp, isEvProp, isDynProp } from './utils';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';

export function remAttr(node, name) {		// , asProp
	node.el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
export function setAttr(node, name, val, asProp) {
	var el = node.el;

	if (val == null)
		remAttr(node, name);		//, asProp?  // will also removeAttr of style: null
	else if (name == "class")
		el.className = val;
	else if (name == "id" || typeof val == "boolean" || asProp)
		el[name] = val;
	else if (name[0] == ".")
		el[name.substr(1)] = val;
	else
		el.setAttribute(name, val);
}

export function patchAttrs(vnode, donor) {
	const nattrs = vnode.attrs;		// || emptyObj
	const oattrs = donor.attrs;		// || emptyObj

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);
		var oval = isDyn ? vnode.el[key] : oattrs[key];

		if (nval === oval) {}
		else if (isStyleProp(key))
			patchStyle(vnode, donor);
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key, nval, oval);
		else
			setAttr(vnode, key, nval, isDyn);
	}

	for (var key in oattrs) {
	//	if (nattrs[key] == null &&
		if (!(key in nattrs) &&
			!isStyleProp(key) &&
			!isSplProp(key) &&
			!isEvProp(key)
		)
			remAttr(vnode, key);
	}
}