import { VTYPE } from './VTYPE';
import { isArr, isObj, isVal, isFunc } from '../utils';
import { isEvProp, styleStr } from './utils';

const voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

export function html(node) {
	// handle if node is vm
	if (node._render) {
		if (!node._node)
			node.mount();
		node = node._node;
	}

	var buf = "";
	switch (node._type) {
		case VTYPE.ELEMENT:
			if (node._el != null && node._tag == null)
				return node._el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)

			buf += "<" + node._tag;

			if (node._attrs) {
				var style = isVal(node._attrs.style) ? node._attrs.style : "";
				var css = isObj(node._attrs.style) ? node._attrs.style : null;

				if (css)
					style += styleStr(css);

				for (var pname in node._attrs) {
					if (isEvProp(pname) || pname[0] === "." || pname[0] === "_")
						continue;

					var val = node._attrs[pname];

					if (isFunc(val))
						val = val();

					if (isObj(val))	// ?
						continue;

					if (val === true)
						buf += " " + pname + '=""';
					else if (val === false) {}
					else if (val !== null && pname[0] !== ".")
						buf += " " + pname + '="' + val + '"';
				}

				if (style.length)
					buf += ' style="' + style.trim() + '"';
			}

			// if body-less svg node, auto-close & return
			if (node.ns != null && node._tag !== "svg" && node._tag !== "math" && node._body == null)
				return buf + "/>";
			else
				buf += ">";
			break;
		case VTYPE.TEXT:
			return node._body;
			break;
	}

	if (!voidTags.test(node._tag)) {
		if (isArr(node._body)) {
			node._body.forEach(function(n2) {
				buf += html(n2);
			});
		}
		else
			buf += node._body || "";

		buf += "</" + node._tag + ">";
	}

	return buf;
};