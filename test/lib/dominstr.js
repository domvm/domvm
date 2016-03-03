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
	var nodeProto = Node.prototype;
	var textContent = Object.getOwnPropertyDescriptor(nodeProto, "textContent");
	var nodeValue = Object.getOwnPropertyDescriptor(nodeProto, "nodeValue");

	var elemProto	= Element.prototype;
	var innerHTML	= Object.getOwnPropertyDescriptor(elemProto, "innerHTML");
	var className	= Object.getOwnPropertyDescriptor(elemProto, "className");
	var id			= Object.getOwnPropertyDescriptor(elemProto, "id");

	var htmlProto = HTMLElement.prototype;
	var innerText = Object.getOwnPropertyDescriptor(htmlProto, "innerText");
	
	// checked, disabled, value, onclick, onkey*, etc..

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

			counts.innerText = 0;
			Object.defineProperty(htmlProto, "innerText", {
				set: function(s) {
					counts.innerText++;
					innerText.set.call(this, s);
				},
			});

			counts.innerHTML = 0;
			Object.defineProperty(elemProto, "innerHTML", {
				set: function(s) {
					counts.innerHTML++;
					innerHTML.set.call(this, s);
				},
			});

			counts.className = 0;
			Object.defineProperty(elemProto, "className", {
				set: function(s) {
					counts.className++;
					className.set.call(this, s);
				},
			});

			counts.id = 0;
			Object.defineProperty(elemProto, "id", {
				set: function(s) {
					counts.id++;
					id.set.call(this, s);
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
			Object.defineProperty(htmlProto, "innerText", innerText);
			Object.defineProperty(elemProto, "innerHTML", innerHTML);
			Object.defineProperty(elemProto, "className", className);
			Object.defineProperty(elemProto, "id", id);
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