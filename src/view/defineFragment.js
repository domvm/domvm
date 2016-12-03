import { FRAGMENT } from './VTYPES';
import { initElementNode } from './initElementNode';

// TODO: defineFragmentSpread?
export function defineFragment(arg0, arg1, arg2, flags) {
	const len = arguments.length;

	var tag, attrs, body;

	// [body]
	if (len == 1) {
		tag = "frag";
		body = arg0;
	}
	// tag, [body]
	else if (len == 2) {
		tag = arg0;
		body = arg1;
	}
	// tag, {attrs}, [body]
	else if (len == 3) {
		tag = arg0;
		attrs = arg1;
		body = arg2;
	}

	let node = initElementNode(tag, attrs, body, flags);

	node.type = FRAGMENT;

	return node;
}