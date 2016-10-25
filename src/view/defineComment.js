import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { VNode } from './VNode';

export function defineComment(body) {
	return new VNode(COMMENT).body(body);
}