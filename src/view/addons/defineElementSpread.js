import { isPlainObj, isArr, isVal, sliceArgs } from '../../utils';
import { initElementNode, LAZY_LIST } from '../initElementNode';

export function defineElementSpread(tag) {
	var args = arguments;
	var len = args.length;
	var body, attrs;

	if (len > 1) {
		var bodyIdx = 1;

		if (isPlainObj(args[1])) {
			attrs = args[1];
			bodyIdx = 2;
		}

		if (len === bodyIdx + 1 && (isVal(args[bodyIdx]) || isArr(args[bodyIdx]) || attrs && (attrs._flags & LAZY_LIST) === LAZY_LIST))
			body = args[bodyIdx];
		else
			body = sliceArgs(args, bodyIdx);
	}

	return initElementNode(tag, attrs, body);
}