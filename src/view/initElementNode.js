import { ELEMENT } from './VTYPES';
import { VNode } from './VNode';
import { cssTag } from './addons/cssTag';
import { isSet, isPlainObj } from '../utils';
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

	var hasId = isSet(parsed.id),
		hasClass = isSet(parsed.class),
		hasAttrs = isSet(parsed.attrs);

	if (hasId || hasClass || hasAttrs) {
		var p = node.attrs || {};

		if (hasId && !isSet(p.id))
			p.id = parsed.id;

		if (hasClass) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (isSet(p.class) ? (" " + p.class) : "");
		}
		if (hasAttrs) {
			for (var key in parsed.attrs)
				if (!isSet(p[key]))
					p[key] = parsed.attrs[key];
		}

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