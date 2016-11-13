import { TEXT } from './VTYPES';
import { VNode } from './VNode';

export function defineText(body) {
	let node = new VNode;
	node.type = TEXT;
	node.body = body;
	return node;
}