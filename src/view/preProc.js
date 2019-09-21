import { TEXT, VVIEW, VMODEL } from './VTYPES';
import { defineText } from './defineText';
import { isVal, isArr, isFunc, insertArr, deepSet } from '../utils';
import { List } from './lazyList';
import { getVm } from './utils';
import { streamVal } from './addons/stream';
import { DEEP_REMOVE } from './initElementNode';
import { devNotify } from "./addons/devmode";
import { onvnode } from "./config";

function setRef(vm, name, node) {
	var path = ("refs." + name).split(".");
	deepSet(vm, path, node);
}

function setDeepRemove(node) {
	while (node = node.parent)
		node.flags |= DEEP_REMOVE;
}

// vnew, vold
export function preProc(vnew, parent, idx, ownVm) {
	// the body of TEXT nodes can technically still mutate after this call if there
	// are adjacent text nodes ahead that will be merged back into this one
	onvnode(vnew, parent, idx, ownVm);

	if (vnew.type === VMODEL || vnew.type === VVIEW)
		return;

	vnew.parent = parent;
	vnew.idx = idx;
	vnew.vm = ownVm;

	if (vnew.ref != null)
		setRef(getVm(vnew), vnew.ref, vnew);

	var nh = vnew.hooks,
		vh = ownVm && ownVm.hooks;

	if (nh && (nh.willRemove || nh.didRemove) ||
		vh && (vh.willUnmount || vh.didUnmount))
		setDeepRemove(vnew);

	if (isArr(vnew.body))
		preProcBody(vnew);
	else if (vnew.body === "")
		vnew.body = null;
	else {
		if (FEAT_STREAM)
			vnew.body = streamVal(vnew.body, getVm(vnew)._stream);
		
		if (FEAT_LAZY_LIST) {
			if (vnew.body != null && !(vnew.body instanceof List))
				vnew.body = "" + vnew.body;
		}
		else {
			if (vnew.body != null)
				vnew.body = "" + vnew.body;
		}
	}
}

export function preProcBody(vnew) {
	var body = vnew.body;

	for (var i = 0; i < body.length; i++) {
		var node2 = body[i];

		// remove false/null/undefined
		if (node2 === false || node2 == null)
			body.splice(i--, 1);
		// flatten arrays
		else if (isArr(node2)) {
			if (_DEVMODE) {
				if (i === 0 || i === body.length - 1)
					devNotify("ARRAY_FLATTENED", [vnew, node2]);
			}
			insertArr(body, node2, i--, 1);
		}
		else {
			if (node2.type == null)
				body[i] = node2 = defineText(node2);

			if (node2.type === TEXT) {
				// remove empty text nodes
				if (node2.body == null || node2.body === "")
					body.splice(i--, 1);
				// merge with previous text node
				else if (i > 0 && body[i-1].type === TEXT) {
					if (_DEVMODE) {
						devNotify("ADJACENT_TEXT", [vnew, body[i-1].body, node2.body]);
					}
					body[i-1].body += node2.body;
					body.splice(i--, 1);
				}
				else
					preProc(node2, vnew, i, null);
			}
			else
				preProc(node2, vnew, i, null);
		}
	}
}