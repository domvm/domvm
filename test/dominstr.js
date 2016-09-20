/**
* Copyright (c) 2016, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* A DOM instrumenting helper for debugging
* https://github.com/leeoniya/domvm
*/
( // Module boilerplate to support commonjs, browser globals and AMD.
  (typeof module === "object" && typeof module.exports === "object" && function (m) { module.exports = m(); }) ||
  (typeof define === "function" && function (m) { define("DOMInstr", m); }) ||
  (function (m) { window.DOMInstr = m(); })
)(function () {
	var isEdge = navigator.userAgent.indexOf("Edge") !== -1;
	var isIE = navigator.userAgent.indexOf("Trident/") !== -1;
	var isMS = isEdge || isIE;

	var nodeProto = Node.prototype;
	var textContent = Object.getOwnPropertyDescriptor(nodeProto, "textContent");
	var nodeValue = Object.getOwnPropertyDescriptor(nodeProto, "nodeValue");

	var htmlProto = HTMLElement.prototype;
//	var innerText = Object.getOwnPropertyDescriptor(htmlProto, "innerText");

	var elemProto	= Element.prototype;
	var innerHTML	= Object.getOwnPropertyDescriptor(!isMS ? elemProto : htmlProto, "innerHTML");
	var className	= Object.getOwnPropertyDescriptor(!isIE ? elemProto : htmlProto, "className");
	var id			= Object.getOwnPropertyDescriptor(!isIE ? elemProto : htmlProto, "id");

	var inpProto = HTMLInputElement.prototype;
	var areaProto = HTMLTextAreaElement.prototype;
	var selProto = HTMLSelectElement.prototype;
	var optProto = HTMLOptionElement.prototype;

	var inpChecked = Object.getOwnPropertyDescriptor(inpProto, "checked");
	var inpVal = Object.getOwnPropertyDescriptor(inpProto, "value");

	var areaVal = Object.getOwnPropertyDescriptor(areaProto, "value");

	var selVal = Object.getOwnPropertyDescriptor(selProto, "value");
	var selIndex = Object.getOwnPropertyDescriptor(selProto, "selectedIndex");

	var optSel = Object.getOwnPropertyDescriptor(optProto, "selected");

	// onclick, onkey*, etc..

//	var styleProto = CSSStyleDeclaration.prototype;
//	var setProperty = Object.getOwnPropertyDescriptor(styleProto, "setProperty");

	function DOMInstr(withTime) {
		var origOps = {
			"document.createElement": null,
			"document.createElementNS": null,
			"document.createTextNode": null,

			"Element.prototype.appendChild": null,
			"Element.prototype.removeChild": null,
			"Element.prototype.insertBefore": null,
			"Element.prototype.replaceChild": null,

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
			Object.defineProperty(nodeProto, "textContent", {
				set: function(s) {
					counts.textContent++;
					textContent.set.call(this, s);
				},
			});

			counts.nodeValue = 0;
			Object.defineProperty(nodeProto, "nodeValue", {
				set: function(s) {
					counts.nodeValue++;
					nodeValue.set.call(this, s);
				},
			});
/*
			counts.innerText = 0;
			Object.defineProperty(htmlProto, "innerText", {
				set: function(s) {
					counts.innerText++;
					innerText.set.call(this, s);
				},
			});
*/
			counts.innerHTML = 0;
			Object.defineProperty(!isMS ? elemProto : htmlProto, "innerHTML", {
				set: function(s) {
					counts.innerHTML++;
					innerHTML.set.call(this, s);
				},
			});

			counts.className = 0;
			Object.defineProperty(!isIE ? elemProto : htmlProto, "className", {
				set: function(s) {
					counts.className++;
					className.set.call(this, s);
				},
			});

			counts.id = 0;
			Object.defineProperty(!isIE ? elemProto : htmlProto, "id", {
				set: function(s) {
					counts.id++;
					id.set.call(this, s);
				},
			});

			counts.checked = 0;
			Object.defineProperty(inpProto, "checked", {
				set: function(s) {
					counts.checked++;
					inpChecked.set.call(this, s);
				},
			});

			counts.value = 0;
			Object.defineProperty(inpProto, "value", {
				set: function(s) {
					counts.value++;
					inpVal.set.call(this, s);
				},
			});
			Object.defineProperty(areaProto, "value", {
				set: function(s) {
					counts.value++;
					areaVal.set.call(this, s);
				},
			});
			Object.defineProperty(selProto, "value", {
				set: function(s) {
					counts.value++;
					selVal.set.call(this, s);
				},
			});

			counts.selectedIndex = 0;
			Object.defineProperty(selProto, "selectedIndex", {
				set: function(s) {
					counts.selectedIndex++;
					selIndex.set.call(this, s);
				},
			});

			counts.selected = 0;
			Object.defineProperty(optProto, "selected", {
				set: function(s) {
					counts.selected++;
					optSel.set.call(this, s);
				},
			});

			/*
			counts.setProperty = 0;
			Object.defineProperty(styleProto, "setProperty", {
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

			Object.defineProperty(nodeProto, "textContent", textContent);
			Object.defineProperty(nodeProto, "nodeValue", nodeValue);
//			Object.defineProperty(htmlProto, "innerText", innerText);
			Object.defineProperty(!isMS ? elemProto : htmlProto, "innerHTML", innerHTML);
			Object.defineProperty(!isIE ? elemProto : htmlProto, "className", className);
			Object.defineProperty(!isIE ? elemProto : htmlProto, "id", id);
			Object.defineProperty(inpProto,  "checked", inpChecked);
			Object.defineProperty(inpProto,  "value", inpVal);
			Object.defineProperty(areaProto, "value", areaVal);
			Object.defineProperty(selProto,  "value", selVal);
			Object.defineProperty(selProto,  "selectedIndex", selIndex);
			Object.defineProperty(optProto,  "selected", optSel);
		//	Object.defineProperty(styleProto, "setProperty", setProperty);

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