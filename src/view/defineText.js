import { VTYPE } from './VTYPE';
import { VNode } from './VNode';

export function defineText(body) {
	var n = new VNode(VTYPE.TEXT);
	n.body = body;
	return n;
}