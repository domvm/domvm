import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { VNode } from './VNode';

export function injectElement(el) {
	var node = new VNode(ELEMENT);
	node.el = node.key = el;
	return node;
}