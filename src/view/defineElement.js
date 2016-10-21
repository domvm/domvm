import { VTYPE } from './VTYPE';
import { VNode } from './VNode';
import { VNodeFixed } from './VNodeFixed';
import { parseTag } from './parseTag';
import { isObj, isUndef } from '../utils';

export function defineElement(tag, arg1, arg2, fixed) {
	var node = fixed ? new VNodeFixed(VTYPE.ELEMENT) : new VNode(VTYPE.ELEMENT);

	var attrs, body;

	if (isUndef(arg2)) {
		if (isObj(arg1))
			attrs = arg1;
		else
			body = arg1;
	}
	else {
		attrs = arg1;
		body = arg2;
	}

	if (attrs != null) {
		if (attrs._key != null)
			node.key = attrs._key;

		if (attrs._ref != null)
			node.ref = attrs._ref;

		if (attrs._hooks != null)
			node.hooks = attrs._hooks;

		if (attrs._raw != null)
			node.raw = attrs._raw;

		if (attrs._data != null)
			node.data = attrs._data;

		node.attrs = attrs;
	}

	var parsed = parseTag(tag);

	node.tag = parsed.tag;

	if (parsed.id || parsed.class || parsed.attrs) {
		var p = node.attrs || {};

		if (parsed.id && p.id == null)
			p.id = parsed.id;

		if (parsed.class) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (p.class != null ? (" " + p.class) : "");
		}
		if (parsed.attrs) {
			for (var key in parsed.attrs)
				if (p[key] == null)
					p[key] = parsed.attrs[key];
		}

//		if (node.attrs != p)
			node.attrs = p;
	}

	if (body != null)
		node.body = body;

	return node;
}