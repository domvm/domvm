const watch = require('node-watch');

const compile = require("./build").compile;

var args = process.argv.slice(2);

var buildName = args[0] || "full";

watch('.', function(file) {
	if (/node_modules|dist|watch\.js|demos|test|stubs\.js/.test(file))
		return;
	if (/\.js$/.test(file))
		compile(buildName);
});