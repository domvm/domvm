import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { VNode } from './VNode';

export function defineText(body) {
	var n = new VNode(TEXT);
	n.body = body;
	return n;
}