'use strict';

require('undom/register');

global.flyd = require('../demos/lib/flyd.min.js');

global.location = {href: {replace: function() {}}};

global.MouseEvent = Event;

global.HTMLElement = Element;

global.window.requestAnimationFrame = function(fn) {
	fn();
};

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

Element.prototype.getBoundingClientRect = function() {};

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

global.domvm = require('../dist/full/domvm.full.cjs.js');

domvm.cfg({
	syncRedraw: true
});

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