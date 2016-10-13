import { VTYPE } from './VTYPE';
import { VNode } from './VNode';

export function injectElement(el) {
	var node = new VNode(VTYPE.ELEMENT);
	node._el = node._key = el;
	return node;
}