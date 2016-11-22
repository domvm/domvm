import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr, isPlainObj, isVal, isFunc, TRUE, ENV_DOM } from '../../utils';
import { isEvProp, isDynProp } from '../utils';
import { autoPx } from './stubs';

import { ViewModelProto, views } from '../ViewModel';
import { VNodeProto } from '../VNode';

ViewModelProto.html = function(dynProps, unreg) {
	var vm = this;

	if (vm.node == null)
		vm._redraw(null, null, false);

	return html(vm.node, dynProps, unreg);
};

VNodeProto.html = function(dynProps, unreg) {
	return html(this, dynProps, unreg);
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

const ENTITY_RE = /[&<>"'\/]/g;

function escHtml(s) {
	s = toStr(s);

	for (var i = 0, out = ''; i < s.length; i++) {
		switch (s[i]) {
			case '&': out += '&amp;';  break;
			case '<': out += '&lt;';   break;
			case '>': out += '&gt;';   break;
			case '"': out += '&quot;'; break;
			case "'": out += '&#039;'; break;
			case '/': out += '&#x2f;'; break;
			default:  out += s[i];
		}
	}

	return out;
}

function escQuotes(s) {
	s = toStr(s);

	for (var i = 0, out = ''; i < s.length; i++)
		out += s[i] == '"' ? '&quot;' : s[i];		// also &?

	return out;
}

export function html(node, dynProps, unreg) {
	var out, style;

	switch (node.type) {
		case VVIEW:
			out = createView(node.view, node.model, node.key, node.opts).html(dynProps, unreg);
			break;
		case VMODEL:
			out = views[node.vmid].html();
			break;
		case ELEMENT:
			if (node.el != null && node.tag == null) {
				out = node.el.outerHTML;		// pre-existing dom elements (does not currently account for any props applied to them)
				break;
			}

			var buf = "";

			buf += "<" + node.tag;

			if (node.attrs) {
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
						buf += html(n2, dynProps, unreg);
					});
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

	if ((unreg || !ENV_DOM) && node.vmid != null)
		views[node.vmid] = null;

	return out;
};