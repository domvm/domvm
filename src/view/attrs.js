export function remAttr(node, name) {
	node.el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
export function setAttr(node, name, val) {
	var el = node.el;

	if (val == null)
		remAttr(node, name);		// will also removeAttr of style: null
	else if (name == "class")
		el.className = val;
	else if (name == "id")
		el.id = val;
	else if (name[0] == ".")
		el[name.substr(1)] = val;
	// todo: diff style? bench individual prop style setting, vs cssText
	else if (typeof val == "boolean")		// name === "type" ||
		el[name] = val;
	else
		el.setAttribute(name, val);
}