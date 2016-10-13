import { VTYPE } from './VTYPE';
import { VNode } from './VNode';

export function defineComment(body) {
	return new VNode(VTYPE.COMMENT).body(body);
}