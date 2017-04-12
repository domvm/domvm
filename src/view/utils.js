import { emptyObj } from '../utils';

export function isEvProp(name) {
	return name[0] === "o" && name[1] === "n";
}

export function isSplProp(name) {
	return name[0] === "_";
}

export function isStyleProp(name) {
	return name === "style";
}

export function repaint(node) {
	node && node.el && node.el.offsetHeight;
}

// tests interactive props where real val should be compared
export function isDynProp(tag, attr) {
//	switch (tag) {
//		case "input":
//		case "textarea":
//		case "select":
//		case "option":
			switch (attr) {
				case "value":
				case "checked":
				case "selected":
//				case "selectedIndex":
					return true;
			}
//	}

	return false;
}

export function getVm(n) {
	n = n || emptyObj;
	while (n.vm == null && n.parent)
		n = n.parent;
	return n.vm;
}