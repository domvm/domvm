import { isObj } from '../utils';
import { initElementNode } from './initElementNode';

export function defineElement(tag, arg1, arg2, flags) {
	var attrs, body;

	if (arg2 == null) {
		if (isObj(arg1))
			attrs = arg1;
		else
			body = arg1;
	}
	else {
		attrs = arg1;
		body = arg2;
	}

	return initElementNode(tag, attrs, body, flags);
}