/**
* Copyright (c) 2016, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.js - DOM ViewModel
* A thin, fast, dependency-free vdom view layer
* https://github.com/leeoniya/domvm
*/

/**
* @preserve https://github.com/leeoniya/domvm
*/

( // Module boilerplate to support commonjs, browser globals and AMD.
	(typeof module === "object" && typeof module.exports === "object" && function (m) { module.exports = m(); }) ||
	(typeof define === "function" && function (m) { define("domvm", m); }) ||
	(function (m) { window.domvm = m(); })
)(function () {
	var domvm = {};

	//--MODULES--//

	return domvm;
});