import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr, isPlainObj, isVal, isFunc, TRUE, ENV_DOM } from '../../utils';
import { isEvProp, isDynProp } from '../utils';
import { autoPx } from './stubs';
import { LAZY_LIST } from '../initElementNode';

import { ViewModelProto } from '../ViewModel';
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
		if (css[pname] != null)
			style += camelDash(pname) + ": " + autoPx(pname, css[pname]) + '; ';
	}

	return style;
}

function toStr(val) {
	return val == null ? '' : ''+val;
}

const voidTags = {
    area: TRUE,
    base: TRUE,
    br: TRUE,
    col: TRUE,
    command: TRUE,
    embed: TRUE,
    hr: TRUE,
    img: TRUE,
    input: TRUE,
    keygen: TRUE,
    link: TRUE,
    meta: TRUE,
    param: TRUE,
    source: TRUE,
    track: TRUE,
	wbr: TRUE
};

function escHtml(s) {
	s = toStr(s);

	for (var i = 0, out = ''; i < s.length; i++) {
		switch (s[i]) {
			case '&': out += '&amp;';  break;
			case '<': out += '&lt;';   break;
			case '>': out += '&gt;';   break;
		//	case '"': out += '&quot;'; break;
		//	case "'": out += '&#039;'; break;
		//	case '/': out += '&#x2f;'; break;
			default:  out += s[i];
		}
	}

	return out;
}

function escQuotes(s) {
	s = toStr(s);

	for (var i = 0, out = ''; i < s.length; i++)
		out += s[i] === '"' ? '&quot;' : s[i];		// also &?

	return out;
}

function eachHtml(arr, dynProps) {
	var buf = '';
	for (var i = 0; i < arr.length; i++)
		buf += html(arr[i], dynProps);
	return buf;
}

export function html(node, dynProps) {
	var out, style;

	switch (node.type) {
		case VVIEW:
			out = createView(node.view, node.model, node.key, node.opts).html(dynProps);
			break;
		case VMODEL:
			out = node.vm.html();
			break;
		case ELEMENT:
			if (node.el != null && node.tag == null) {
				out = node.el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)
				break;
			}

			var buf = "";

			buf += "<" + node.tag;

			if (node.attrs != null) {
				for (var pname in node.attrs) {
					if (isEvProp(pname) || pname[0] === "." || pname[0] === "_" || dynProps === false && isDynProp(node.tag, pname))
						continue;

					var val = node.attrs[pname];

					if (pname === "style" && val != null) {
						style = typeof val === "object" ? styleStr(val) : val;
						continue;
					}

					if (val === true)
						buf += " " + escHtml(pname) + '=""';
					else if (val === false) {}
					else if (val != null)
						buf += " " + escHtml(pname) + '="' + escQuotes(val) + '"';
				}

				if (style != null)
					buf += ' style="' + escQuotes(style.trim()) + '"';
			}

			// if body-less svg node, auto-close & return
			if (node.body == null && node.ns != null && node.tag !== "svg")
				return buf + "/>";
			else
				buf += ">";

			if (!voidTags[node.tag]) {
				if (isArr(node.body))
					buf += eachHtml(node.body, dynProps);
				else if ((node.flags & LAZY_LIST) === LAZY_LIST) {
					node.body.body(node);
					buf += eachHtml(node.body, dynProps);
				}
				else
					buf += node.raw ? node.body : escHtml(node.body);

				buf += "</" + node.tag + ">";
			}
			out = buf;
			break;
		case TEXT:
			out = escHtml(node.body);
			break;
		case COMMENT:
			out = "<!--" + escHtml(node.body) + "-->";
			break;
	}

	return out;
};