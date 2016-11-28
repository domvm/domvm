import { VNode } from './VNode';
import { FRAGMENT } from './VTYPES';

// expects body to be an array
// TODO: ("type", attrs {}, body [])
export function defineFragment(body) {
	let node = new VNode;

	node.type = FRAGMENT;
	node.body = body;

	return node;
}