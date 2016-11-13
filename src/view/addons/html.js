import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { isArr, isObj, isVal, isFunc } from '../../utils';
import { isEvProp, isDynProp } from '../utils';
import { autoPx } from './autoPx';

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


function camelDash(val) {
	return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function styleStr(css) {
	var style = "";

	for (var pname in css) {
		if (css[pname] !== null)
			style += camelDash(pname) + ": " + autoPx(pname, css[pname]) + '; ';
	}

	return style;
}

const voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

var htmlEnts = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;'
};

var htmlEntsRx = /[&<>"'\/]/g;

function escHtml(string) {
	if (string == null)
		return '';

	return ('' + string).replace(htmlEntsRx, function(match) {
		return htmlEnts[match];
	});
}

export function html(node, dynProps) {
	var buf = "";
	switch (node.type) {
		case ELEMENT:
			if (node.el != null && node.tag == null)
				return node.el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)

			buf += "<" + escHtml(node.tag);

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
						buf += " " + escHtml(pname) + '=""';
					else if (val === false) {}
					else if (val !== null && pname[0] !== ".")
						buf += " " + escHtml(pname) + '="' + escHtml(val) + '"';
				}

				if (style.length)
					buf += ' style="' + escHtml(style.trim()) + '"';
			}

			// if body-less svg node, auto-close & return
			if (node.ns != null && node.tag !== "svg" && node.tag !== "math" && node.body == null)
				return buf + "/>";
			else
				buf += ">";
			break;
		case TEXT:
			return escHtml(node.body);
			break;
	}

	if (!voidTags.test(node.tag)) {
		if (isArr(node.body)) {
			node.body.forEach(function(n2) {
				buf += html(n2);
			});
		}
		else
			buf += node.raw ? node.body : escHtml(node.body) || "";

		buf += "</" + escHtml(node.tag) + ">";
	}

	return buf;
};