import { VTYPE } from './VTYPE';
import { VNode } from './VNode';

export function defineText(body) {
	return new VNode(VTYPE.TEXT).body(body);
}