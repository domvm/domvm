'use strict';

require('undom/register');

global.location = {href: {replace: function() {}}};

global.MouseEvent = Event;

global.HTMLElement = Element;

Object.defineProperty(Element.prototype, "onclick", {
	configurable: true,
	set: function(s) {
		if (s == null || s === "") {
			this.removeEventListener("click", this._onclick);
			delete this._onclick;
		}
		else {
			this._onclick = s;
			this.addEventListener("click", this._onclick);
		}
	},
	get: function() {
		return this._onclick;
	},
});

Object.defineProperty(Element.prototype, "value", {
	configurable: true,
	set: function(s) {
		this._value = ""+s;
	},
	get: function() {
		return this._value || '';
	},
});

Object.defineProperty(Element.prototype, "textContent", {
	configurable: true,
	set: function(v) {
		this.childNodes.length = 0;
		this.childNodes.push(new Text(v));
	},
	get: function() {
	//	return this.childNodes.join("");
	},
});

Element.prototype.matches = function(sel) {
	return sel == "*" || sel == this.nodeName.toLowerCase();
};

Element.prototype.dispatchEvent = function(event) {
	let t = event.target = this,
		c = event.cancelable,
		l, i;
	do {
		l = t.__handlers && t.__handlers[(event.type).toLowerCase()];
		if (l && (event.currentTarget = t)) for (i=l.length; i--; ) {
			if ((l[i].call(t, event)===false || event._end) && c) break;
		}
	} while (event.bubbles && !(c && event._stop) && (t=t.parentNode));
	return !event.defaultPrevented;
};

function findById(par, id) {
	for (var i = 0; i < par.childNodes.length; i++) {
		var n = par.childNodes[i];

		if (n.id == id)
			return n;

		var subFound = findById(n, id);

		if (subFound)
			return subFound;
	}

	return null;
}

document.getElementById = function(id) {
	return findById(document.body, id);
};

document.createComment = function(text) {
	var el = document.createElement("span");
	el.textContent = text;
	return el;
}

//global.assert = require('chai').assert;

global.assert = function() {};
assert.propEqual = assert.expect = function() {};

assert.async = function() { return function() {} };
assert.ok = assert.equal = assert.deepEqual = function() {};

global.domvm = require('../dist/spec/domvm.spec.js');

domvm.DEVMODE.syncRedraw = true
domvm.DEVMODE.mutations = false
domvm.DEVMODE.warnings = false;
domvm.DEVMODE.verbose = false;

global.QUnit = {
	module: function(name, fn) {
		describe(name, fn);
	},
	test: function(name, cb) {
		it(name, function(done) {
			cb(assert);
			done();
		});
	},
	skip: function() {}
};

global.anonView = function(tpl) {
	return function AnonView(vm, model) {
		return function() {
			return tpl;
		};
	}
};

global.evalOut = function() {}

global.testyDiv = document.createElement("div");
document.body.appendChild(testyDiv);

function DOMInstr() {
	this.start = function() {};
	this.end = function() {};
}

global.instr = new DOMInstr();

global.el = domvm.defineElement;
global.tx = domvm.defineText;
global.cm = domvm.defineComment;
global.fr = domvm.defineFragment;
global.vw = domvm.defineView;
global.iv = domvm.injectView;
global.ie = domvm.injectElement;