import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';
import { cssTag } from './addons/stubs';
import { isPlainObj } from '../utils';

function isSet(val) {
	return val != null;
}

// optimization flags

// prevents inserting/removing/reordering of children
export const FIXED_BODY = 1;
// doesnt fire eager deep willRemove hooks, doesnt do bottom-up removeChild
export const FAST_REMOVE = 2;

export function initElementNode(tag, attrs, body, flags) {
	let node = new VNode;

	node.type = ELEMENT;

	if (isSet(flags))
		node.flags = flags;

	if (isSet(attrs)) {
		if (isSet(attrs._key))
			node.key = attrs._key;

		if (isSet(attrs._ref))
			node.ref = attrs._ref;

		if (isSet(attrs._hooks))
			node.hooks = attrs._hooks;

		if (isSet(attrs._raw))
			node.raw = attrs._raw;

		if (isSet(attrs._data))
			node.data = attrs._data;

		if (isSet(attrs._list))
			node.list = attrs._list;

		if (!isSet(node.key)) {
			if (isSet(node.ref))
				node.key = node.ref;
			else if (isSet(attrs.id))
				node.key = attrs.id;
			else if (isSet(attrs.name))
				node.key = attrs.name;
		}

		node.attrs = attrs;
	}

	var parsed = cssTag(tag);

	node.tag = parsed.tag;

	if (parsed.id || parsed.class || parsed.attrs) {
		var p = node.attrs || {};

		if (parsed.id && !isSet(p.id))
			p.id = parsed.id;

		if (parsed.class) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (isSet(p.class) ? (" " + p.class) : "");
		}
		if (parsed.attrs) {
			for (var key in parsed.attrs)
				if (!isSet(p[key]))
					p[key] = parsed.attrs[key];
		}

//		if (node.attrs != p)
			node.attrs = p;
	}

	if (body != null)
		node.body = body;

	return node;
}