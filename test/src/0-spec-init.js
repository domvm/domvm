'use strict';

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const DEFAULT_HTML = '<!doctype html><html><body></body></html>';

global.window = (new JSDOM(DEFAULT_HTML)).window;
global.document = window.document;
global.navigator = window.navigator;

global.Element = window.Element;
global.HTMLElement = window.HTMLElement;
global.MouseEvent = window.MouseEvent;

global.assert = require('chai').assert;

assert.propEqual = assert.expect = function() {};

assert.async = function() { return function() {} };

global.domvm = require('../../dist/spec/domvm.spec.js');

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