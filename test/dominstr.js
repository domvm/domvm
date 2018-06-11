/**
* Copyright (c) 2018, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* A DOM instrumenting helper for debugging
* https://github.com/domvm/domvm
*/
( // Module boilerplate to support commonjs, browser globals and AMD.
  (typeof module === "object" && typeof module.exports === "object" && function (m) { module.exports = m(); }) ||
  (typeof define === "function" && function (m) { define("DOMInstr", m); }) ||
  (function (m) { window.DOMInstr = m(); })
)(function () {
	var isEdge = navigator.userAgent.indexOf("Edge") !== -1;
	var isIE = navigator.userAgent.indexOf("Trident/") !== -1;
	var isMS = isEdge || isIE;

	var getDescr = Object.getOwnPropertyDescriptor;
	var defProp = Object.defineProperty;

	var nodeProto = Node.prototype;
	var textContent = getDescr(nodeProto, "textContent");
	var nodeValue = getDescr(nodeProto, "nodeValue");

	var htmlProto = HTMLElement.prototype;
	var innerText = getDescr(htmlProto, "innerText");

	var elemProto	= Element.prototype;
	var innerHTML	= getDescr(!isIE ? elemProto : htmlProto, "innerHTML");
	var className	= getDescr(!isIE ? elemProto : htmlProto, "className");
	var id			= getDescr(!isIE ? elemProto : htmlProto, "id");

	var styleProto	= CSSStyleDeclaration.prototype;

	var cssText		= getDescr(styleProto, "cssText");

	var inpProto = HTMLInputElement.prototype;
	var areaProto = HTMLTextAreaElement.prototype;
	var selProto = HTMLSelectElement.prototype;
	var optProto = HTMLOptionElement.prototype;

	var inpChecked = getDescr(inpProto, "checked");
	var inpVal = getDescr(inpProto, "value");

	var areaVal = getDescr(areaProto, "value");

	var selVal = getDescr(selProto, "value");
	var selIndex = getDescr(selProto, "selectedIndex");

	var optSel = getDescr(optProto, "selected");

	// onclick, onkey*, etc..

//	var styleProto = CSSStyleDeclaration.prototype;
//	var setProperty = getDescr(styleProto, "setProperty");

	function DOMInstr(withTime) {
		var origOps = {
			"document.createElement": null,
			"document.createElementNS": null,
			"document.createTextNode": null,
			"document.createComment": null,
			"document.createDocumentFragment": null,

			"Node.prototype.addEventListener": null,
			"Node.prototype.removeEventListener": null,

			"DocumentFragment.prototype.insertBefore": null,		// appendChild

			"Element.prototype.appendChild": null,
			"Element.prototype.removeChild": null,
			"Element.prototype.insertBefore": null,
			"Element.prototype.replaceChild": null,
			"Element.prototype.remove": null,

			"Element.prototype.setAttribute": null,
			"Element.prototype.setAttributeNS": null,
			"Element.prototype.removeAttribute": null,
			"Element.prototype.removeAttributeNS": null,

			// assign?
			// dataset, classlist, any props like .onchange

			// .style.setProperty, .style.cssText
		};

		var counts = {};
		var start = null;

		function ctxName(opName) {
			var opPath = opName.split(".");
			var o = window;
			while (opPath.length > 1)
				o = o[opPath.shift()];

			return {ctx: o, last: opPath[0]};
		}

		this.start = function() {
			for (var opName in origOps) {
				var p = ctxName(opName);

				if (origOps[opName] === null)
					origOps[opName] = p.ctx[p.last];

				(function(opName, opShort) {
					counts[opShort] = 0;
					p.ctx[opShort] = function() {
						counts[opShort]++;
						return origOps[opName].apply(this, arguments);
					};
				})(opName, p.last);
			}

			counts.textContent = 0;
			defProp(nodeProto, "textContent", {
				set: function(s) {
					counts.textContent++;
					textContent.set.call(this, s);
				},
			});

			counts.nodeValue = 0;
			defProp(nodeProto, "nodeValue", {
				set: function(s) {
					counts.nodeValue++;
					nodeValue.set.call(this, s);
				},
			});

			counts.innerText = 0;
			defProp(htmlProto, "innerText", {
				set: function(s) {
					counts.innerText++;
					innerText.set.call(this, s);
				},
			});

			counts.innerHTML = 0;
			defProp(!isIE ? elemProto : htmlProto, "innerHTML", {
				set: function(s) {
					counts.innerHTML++;
					innerHTML.set.call(this, s);
				},
			});

			counts.className = 0;
			defProp(!isIE ? elemProto : htmlProto, "className", {
				set: function(s) {
					counts.className++;
					className.set.call(this, s);
				},
			});

			counts.cssText = 0;
			defProp(styleProto, "cssText", {
				set: function(s) {
					counts.cssText++;
					cssText.set.call(this, s);
				},
			});

			counts.id = 0;
			defProp(!isIE ? elemProto : htmlProto, "id", {
				set: function(s) {
					counts.id++;
					id.set.call(this, s);
				},
			});

			counts.checked = 0;
			defProp(inpProto, "checked", {
				set: function(s) {
					counts.checked++;
					inpChecked.set.call(this, s);
				},
			});

			counts.value = 0;
			defProp(inpProto, "value", {
				set: function(s) {
					counts.value++;
					inpVal.set.call(this, s);
				},
			});
			defProp(areaProto, "value", {
				set: function(s) {
					counts.value++;
					areaVal.set.call(this, s);
				},
			});
			defProp(selProto, "value", {
				set: function(s) {
					counts.value++;
					selVal.set.call(this, s);
				},
			});

			counts.selectedIndex = 0;
			defProp(selProto, "selectedIndex", {
				set: function(s) {
					counts.selectedIndex++;
					selIndex.set.call(this, s);
				},
			});

			counts.selected = 0;
			defProp(optProto, "selected", {
				set: function(s) {
					counts.selected++;
					optSel.set.call(this, s);
				},
			});

			/*
			counts.setProperty = 0;
			defProp(styleProto, "setProperty", {
				set: function(s) {
					counts.setProperty++;
					setProperty.set.call(this, s);
				},
			});
			*/

			start = +new Date;
		};

		this.end = function() {
			var _time = +new Date - start;
			start = null;

			for (var opName in origOps) {
				var p = ctxName(opName);
				p.ctx[p.last] = origOps[opName];
			}

			defProp(nodeProto, "textContent", textContent);
			defProp(nodeProto, "nodeValue", nodeValue);
			defProp(htmlProto, "innerText", innerText);
			defProp(!isIE ? elemProto : htmlProto, "innerHTML", innerHTML);
			defProp(!isIE ? elemProto : htmlProto, "className", className);
			defProp(!isIE ? elemProto : htmlProto, "id", id);
			defProp(inpProto,  "checked", inpChecked);
			defProp(inpProto,  "value", inpVal);
			defProp(areaProto, "value", areaVal);
			defProp(selProto,  "value", selVal);
			defProp(selProto,  "selectedIndex", selIndex);
			defProp(optProto,  "selected", optSel);
		//	defProp(styleProto, "setProperty", setProperty);
			defProp(styleProto, "cssText", cssText);

			var out = {};

			for (var i in counts)
				if (counts[i] > 0)
					out[i] = counts[i];

			if (withTime)
				out._time = _time;

			return out;
		};
	}

	return DOMInstr;
});