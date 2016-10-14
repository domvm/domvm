import { VTYPE } from './VTYPE';
import { VNode } from './VNode';

export function injectElement(el) {
	var node = new VNode(VTYPE.ELEMENT);
	node.el = node.key = el;
	return node;
}