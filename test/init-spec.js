'use strict';

require('undom/register');

global.location = {href: {replace: function() {}}};
global.HTMLElement = Element;

function findById(par, id) {
	for (var i = 0; i < par.childNodes.length; i++) {
		var n = par.childNodes[i];

		if (n.id == id)
			return n;
		/*
		for (var j = 0; j < n.attributes.length; j++) {
			if (n.attributes[j].name == "id" && n.attributes[j].value == id)
				return n;
		}
		*/
		var subFound = findById(n, id);

		if (subFound)
			return subFound;
	}
	return null;
}

document.getElementById = function(id) {
	findById(document.body, id);
};

global.assert = require('chai').assert;

assert.propEqual = assert.expect = function() {};

assert.async = function() { return function() {} };

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