import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr } from '../../utils';
import { isPropAttr, isEvAttr, isDynAttr, isSplAttr } from '../utils';
import { autoPx } from './autoPx';
import { LAZY_LIST } from '../initElementNode';

export function vmProtoHtml(dynProps) {
	var vm = this;

	if (vm.node == null)
		vm._redraw(null, null, false);

	return html(vm.node, dynProps);
};

export function vProtoHtml(dynProps) {
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
    area: true,
    base: true,
    br: true,
    col: true,
    command: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
	wbr: true
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

const innerHTML = ".innerHTML";

function html(node, dynProps) {
	var out, style;

	switch (node.type) {
		case VVIEW:
			out = createView(node.view, node.data, node.key, node.opts).html(dynProps);
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

			var attrs = node.attrs,
				hasAttrs = attrs != null;

			if (hasAttrs) {
				for (var pname in attrs) {
					if (isEvAttr(pname) || isPropAttr(pname) || isSplAttr(pname) || dynProps === false && isDynAttr(node.tag, pname))
						continue;

					var val = attrs[pname];

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
				if (hasAttrs && attrs[innerHTML] != null)
					buf += attrs[innerHTML];
				else if (isArr(node.body))
					buf += eachHtml(node.body, dynProps);
				else if ((node.flags & LAZY_LIST) === LAZY_LIST) {
					node.body.body(node);
					buf += eachHtml(node.body, dynProps);
				}
				else
					buf += escHtml(node.body);

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