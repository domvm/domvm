import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';

export function injectElement(el) {
	let node = new VNode;
	node.type = ELEMENT;
	node.el = node.key = el;
	return node;
}