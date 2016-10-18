import { isDynProp } from './utils';

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