import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';
import { cssTag } from './addons/cssTag';
import { isSet, isPlainObj } from '../utils';
import { devNotify } from "./addons/devmode";

// (de)optimization flags

// prevents inserting/removing/reordering of children
export const FIXED_BODY = 1;
// forces slow bottom-up removeChild to fire deep willRemove/willUnmount hooks,
export const DEEP_REMOVE = 2;
// enables fast keyed lookup of children via binary search, expects homogeneous keyed body
export const KEYED_LIST = 4;
// indicates an vnode match/diff/recycler function for body
export const LAZY_LIST = 8;

export function initElementNode(tag, attrs, body, flags) {
	let node = new VNode;

	node.type = ELEMENT;

	if (isSet(flags))
		node.flags = flags;

	node.attrs = attrs;

	var parsed = cssTag(tag);

	node.tag = parsed.tag;

	// meh, weak assertion, will fail for id=0, etc.
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

//		if (node.attrs !== p)
			node.attrs = p;
	}

	var mergedAttrs = node.attrs;

	if (isSet(mergedAttrs)) {
		if (isSet(mergedAttrs._key))
			node.key = mergedAttrs._key;

		if (isSet(mergedAttrs._ref))
			node.ref = mergedAttrs._ref;

		if (isSet(mergedAttrs._hooks))
			node.hooks = mergedAttrs._hooks;

		if (isSet(mergedAttrs._raw))
			node.raw = mergedAttrs._raw;

		if (isSet(mergedAttrs._data))
			node.data = mergedAttrs._data;

		if (isSet(mergedAttrs._flags))
			node.flags = mergedAttrs._flags;

		if (!isSet(node.key)) {
			if (isSet(node.ref))
				node.key = node.ref;
			else if (isSet(mergedAttrs.id))
				node.key = mergedAttrs.id;
			else if (isSet(mergedAttrs.name))
				node.key = mergedAttrs.name;
		}
	}

	if (body != null)
		node.body = body;

	if (_DEVMODE) {
		if (node.tag === "svg") {
			setTimeout(function() {
				node.ns == null && devNotify("SVG_WRONG_FACTORY", [node]);
			}, 16);
		}
		else if (node.tag === "input" && node.key == null)
			devNotify("UNKEYED_INPUT", [node]);
	}

	return node;
}