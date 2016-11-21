import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr, isPlainObj, isVal, isFunc, TRUE } from '../../utils';
import { isEvProp, isDynProp } from '../utils';
import { autoPx } from './stubs';

import { ViewModelProto, views } from '../ViewModel';
import { VNodeProto } from '../VNode';

ViewModelProto.html = function(dynProps) {
	var vm = this;

	if (vm.node == null)
		vm._redraw(null, null, false);

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

const voidTags = {
	img: TRUE,
	br: TRUE,
	input: TRUE,
	col: TRUE,
	link: TRUE,
	meta: TRUE,
	area: TRUE,
	base: TRUE,
	command: TRUE,
	embed: TRUE,
	hr: TRUE,
	keygen: TRUE,
	param: TRUE,
	source: TRUE,
	track: TRUE,
	wbr: TRUE,
};

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

function escQuotes(string) {
	if (string == null)
		return '';

	return ('' + string).replace(/"/g, htmlEnts['"']);
}

export function html(node, dynProps) {
	switch (node.type) {
		case VVIEW:
			return createView(node.view, node.model, node.key, node.opts).html();
		case VMODEL:
			return views[node.vmid].html();
		case ELEMENT:
			if (node.el != null && node.tag == null)
				return node.el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)

			var buf = "";

			buf += "<" + node.tag;

			if (node.attrs) {
				var style = null;

				for (var pname in node.attrs) {
					if (isEvProp(pname) || pname[0] == "." || pname[0] == "_" || dynProps === false && isDynProp(node.tag, pname))
						continue;

					var val = node.attrs[pname];

					if (pname == "style" && val != null) {
						style = typeof val == "object" ? styleStr(val) : val;
						continue;
					}

					if (val === true)
						buf += " " + escHtml(pname) + '=""';
					else if (val === false) {}
					else if (val != null && pname[0] != ".")
						buf += " " + escHtml(pname) + '="' + escQuotes(val) + '"';
				}

				if (style != null)
					buf += ' style="' + escQuotes(style.trim()) + '"';
			}

			// if body-less svg node, auto-close & return
		//	if (node.ns != null && node.tag !== "svg" && node.tag !== "math" && node.body == null)
		//		return buf + "/>";
		//	else
				buf += ">";

			if (voidTags[node.tag] == null) {
				if (isArr(node.body)) {
					node.body.forEach(function(n2) {
						buf += html(n2, dynProps);
					});
				}
				else
					buf += node.raw ? node.body : escHtml(node.body) || "";

				buf += "</" + node.tag + ">";
			}
			return buf;
		case TEXT:
			return escHtml(node.body);
		case COMMENT:
			return "<!--" + escHtml(node.body) + "-->";
	}
};