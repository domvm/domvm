import { emptyObj } from '../utils';

export function isPropAttr(name) {
	return FEAT_PROP_ATTRS && name[0] === ".";
}

export function isEvAttr(name) {
	return name[0] === "o" && name[1] === "n";
}

export function isSplAttr(name) {
	return FEAT_SPL_ATTRS && name[0] === "_";
}

export function isStyleAttr(name) {
	return name === "style";
}

export function repaint(node) {
	node && node.el && node.el.offsetHeight;
}

export function isHydrated(vm) {
	return vm.node != null && vm.node.el != null;
}

// tests interactive props where real val should be compared
export function isDynAttr(tag, attr) {
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