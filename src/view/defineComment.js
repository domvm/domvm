import { COMMENT } from './VTYPES';
import { VNode } from './VNode';

export function defineComment(body) {
	let node = new VNode;
	node.type = COMMENT;
	node.body = body;
	return node;
}