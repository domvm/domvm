import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';
import { cssTag } from './addons/stubs';
import { isPlainObj } from '../utils';

// optimization flags

// prevents inserting/removing/reordering of children
export const FIXED_BODY = 1;
// doesnt fire eager deep willRemove hooks, doesnt do bottom-up removeChild
export const FAST_REMOVE = 2;

export function initElementNode(tag, attrs, body, flags) {
	let node = new VNode;

	node.type = ELEMENT;

	if (flags != null)
		node._flags = flags;

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

		if (node.key == null) {
			if (node.ref != null)
				node.key = node.ref;
			else if (attrs.id != null)
				node.key = attrs.id;
			else if (attrs.name != null)
				node.key = attrs.name;
		}

		node.attrs = attrs;
	}

	var parsed = cssTag(tag);

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