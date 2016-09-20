var buble = require("rollup-plugin-buble");
var uglify = require("rollup-plugin-uglify");
var fs = require('fs');

module.exports = {
	entry: "./index.js",
	dest: "./dist/domvm.min.js",
	moduleName: "domvm",
	sourceMap: true,
	format: 'umd',		// "iife"
	plugins: [ buble(), uglify() ],
};