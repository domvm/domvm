import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { isArr, isObj, isVal, isFunc } from '../../utils';
import { isEvProp, styleStr, isDynProp } from '../utils';

import { ViewModelProto } from '../ViewModel';
import { VNodeProto } from '../VNode';

ViewModelProto.html = function(dynProps) {
	var vm = this;

	if (vm.node == null)
		vm.mount(null, false, false);

	return html(vm.node, dynProps);
};

VNodeProto.html = function(dynProps) {
	return html(this, dynProps);
};

const voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

export function html(node, dynProps) {
	var buf = "";
	switch (node.type) {
		case ELEMENT:
			if (node.el != null && node.tag == null)
				return node.el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)

			buf += "<" + node.tag;

			if (node.attrs) {
				var style = isVal(node.attrs.style) ? node.attrs.style : "";
				var css = isObj(node.attrs.style) ? node.attrs.style : null;

				if (css)
					style += styleStr(css);

				for (var pname in node.attrs) {
					if (isEvProp(pname) || pname[0] === "." || pname[0] === "_" || dynProps === false && isDynProp(node.tag, pname))
						continue;

					var val = node.attrs[pname];

				//	if (isFunc(val))
				//		val = val();

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
			if (node.ns != null && node.tag !== "svg" && node.tag !== "math" && node.body == null)
				return buf + "/>";
			else
				buf += ">";
			break;
		case TEXT:
			return node.body;
			break;
	}

	if (!voidTags.test(node.tag)) {
		if (isArr(node.body)) {
			node.body.forEach(function(n2) {
				buf += html(n2);
			});
		}
		else
			buf += node.body || "";

		buf += "</" + node.tag + ">";
	}

	return buf;
};