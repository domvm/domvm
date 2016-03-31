(function(domvm) {
	"use strict";

	var voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

	var u = domvm.utils;

	domvm.html = function(node) {
		var html = "";
		switch (node.type) {
			case u.TYPE_ELEM:
				html += "<" + node.tag;

				if (node.props) {
					var style = u.isVal(node.props.style) ? node.props.style : "";
					var css = u.isObj(node.props.style) ? node.props.style : null;

					if (css) {
						for (var pname in css) {
							if (css[pname] !== null)
								style += u.camelDash(pname) + ": " + u.autoPx(pname, css[pname]) + '; ';
						}
					}

					for (var pname in node.props) {
						if (u.isEvProp(pname) || pname[0] === ".")
							continue;

						var val = node.props[pname];

						if (u.isFunc(val))
							val = val();

						if (u.isObj(val))
							continue;

						if (val === true)
							html += " " + pname;
						else if (val === false) {}
						else if (val !== null && pname[0] !== ".")
							html += " " + pname + '="' + val + '"';
					}

					if (style.length)
						html += ' style="' + style.trim() + '"';
				}

				// if body-less svg node, auto-close & return
				if (node.ns && node.tag !== "svg" && node.tag !== "math" && !node.body)
					return html + "/>";
				else
					html += ">";
				break;
			case u.TYPE_TEXT:
				return node.body;
				break;
		}

		if (!voidTags.test(node.tag)) {
			if (u.isArr(node.body)) {
				node.body.forEach(function(n2) {
					html += domvm.html(n2);
				});
			}
			else
				html += node.body || "";

			html += "</" + node.tag + ">";
		}

		return html;
	};
})(domvm);