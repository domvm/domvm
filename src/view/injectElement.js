import { UNMANAGED } from './VTYPES';
import { VNode } from './VNode';

export function injectElement(el) {
	let node = new VNode;
	node.type = UNMANAGED;
	node.el = node.key = el;
	return node;
}