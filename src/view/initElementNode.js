import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';
import { cssTag } from './addons/cssTag';
import { isPlainObj } from '../utils';
import { devNotify } from "./addons/devmode";

// (de)optimization flags

// forces slow bottom-up removeChild to fire deep willRemove/willUnmount hooks,
export const DEEP_REMOVE = 1 << 0;
// prevents inserting/removing/reordering of children
export const FIXED_BODY = 1 << 1;
// enables fast keyed lookup of children via binary search, expects homogeneous keyed body
export const KEYED_LIST = 1 << 2;
// indicates an vnode match/diff/recycler function for body
export const LAZY_LIST = 1 << 3;

export function initElementNode(tag, attrs, body, flags) {
	let node = new VNode;

	node.type = ELEMENT;

	node.flags = flags || 0;

	node.attrs = attrs || null;

	var parsed = cssTag(tag);

	node.tag = parsed.tag;

	var hasId = parsed.id != null,
		hasClass = parsed.class != null,
		hasAttrs = parsed.attrs != null;

	if (hasId || hasClass || hasAttrs) {
		var p = node.attrs || {};

		if (hasId && p.id == null)
			p.id = parsed.id;

		if (hasClass) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (p.class != null ? (" " + p.class) : "");
		}
		if (hasAttrs) {
			for (var key in parsed.attrs)
				if (p[key] == null)
					p[key] = parsed.attrs[key];
		}

		node.attrs = p;
	}

	var mergedAttrs = node.attrs;

	if (mergedAttrs != null) {
		if (mergedAttrs._key != null)
			node.key = mergedAttrs._key;

		if (mergedAttrs._ref != null)
			node.ref = mergedAttrs._ref;

		if (mergedAttrs._hooks != null)
			node.hooks = mergedAttrs._hooks;

		if (mergedAttrs._data != null)
			node.data = mergedAttrs._data;

		if (mergedAttrs._flags != null)
			node.flags = mergedAttrs._flags;

		if (node.key == null) {
			if (node.ref != null)
				node.key = node.ref;
			else if (mergedAttrs.id != null)
				node.key = mergedAttrs.id;
			else if (mergedAttrs.name != null)
				node.key = mergedAttrs.name + (mergedAttrs.type === "radio" || mergedAttrs.type === "checkbox" ? mergedAttrs.value : "");
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
		// todo: attrs.contenteditable === "true"?
		else if (/^(?:input|textarea|select|datalist|keygen|output)$/.test(node.tag) && node.key == null)
			devNotify("UNKEYED_INPUT", [node]);
	}

	return node;
}