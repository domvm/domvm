import { isPlainObj, sliceArgs } from '../../utils';
import { initElementNode } from '../initElementNode';
import { VNode } from '../VNode';
import { VView } from '../VView';
import { VModel } from '../VModel';

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

		if (len === bodyIdx + 1 && !(args[bodyIdx] instanceof VNode) && !(args[bodyIdx] instanceof VView) && !(args[bodyIdx] instanceof VModel))
			body = args[bodyIdx];
		else
			body = sliceArgs(args, bodyIdx);
	}

	return initElementNode(tag, attrs, body);
}