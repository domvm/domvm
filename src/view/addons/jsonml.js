import { isVal, isArr, isObj, isFunc, isElem } from '../../utils';

import { defineElement } from "../defineElement";
import { defineText } from "../defineText";
import { defineComment } from "../defineComment";
import { defineView } from "../defineView";

import { injectView } from "../injectView";
import { injectElement } from "../injectElement";

function isStr(val) {
	return typeof val == "string";
}

// tpl must be an array representing a single domvm 1.x jsonML node
// todo: also handle getter fns in attrs & css props
export function jsonml(node) {
	// nulls
	if (node == null) {}
	// view defs, elem defs, sub-arrays, comments?
	else if (isArr(node)) {
		var len = node.length;

		// empty arrays
		if (len == 0)
			node = null;
		// elem defs: ["div"], ["div", {attrs}], ["div", [children]], ["div", ...children], ["div", {attrs}, [children]], ["div", {attrs}, ...children]
		else if (isStr(node[0])) {
			var tag = node[0];
			var body = null;
			var attrs = null;

			if (len > 1) {
				var bodyIdx = 1;

				if (isObj(node[1])) {
					attrs = node[1];
					bodyIdx = 2;
				}

				if (len == bodyIdx + 1) {
					var last = node[bodyIdx];
					// explit child array or plain val
					if (isVal(last) || isArr(last) && !isStr(last[0]) && !isFunc(last[0]))
						body = last;
					else
						body = [last];
				}
				else
					body = node.slice(bodyIdx);
			}

			if (isArr(body))
				body = body.map(jsonml);

			node = defineElement(tag, attrs, body, false);
		}
		// view defs: [MyView, model, key, opts]
		else if (isFunc(node[0]))
			node = defineView.apply(null, node);
		// sub-array to flatten
		else
			node = node.map(jsonml);
	}
	// text nodes
	else if (isVal(node))
		node = defineText(node);
	// getters
	else if (isFunc(node))
		node = jsonml(node());
	// injected elements
	else if (isElem(node))
		node = injectElement(node);
	else if (isObj(node)) {
		// injected vms
		if (isFunc(node.redraw))
			node = injectView(node);
		// ready vnodes (meh, weak guarantee)
		else if (node.type != null) {}
	}

	return node;
}