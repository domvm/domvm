const rollup = require('rollup').rollup;
const buble = require('rollup-plugin-buble');
const fs = require('fs');
const exec = require('child_process').exec;

var args = process.argv.slice(2);

if (args.length == 1)
	compile(args[0]);

module.exports.compile = compile;

function compile(buildName) {
	var start = +new Date;

	rollup({
		entry: './dist/builds/' + buildName + '.js',
		plugins: [ buble() ],
	})
	.then(function(bundle) {
		bundle.write({
			banner: [
				"/**",
				"* Copyright (c) 2016, Leon Sorokin",
				"* All rights reserved. (MIT Licensed)",
				"*",
				"* domvm.full.js - DOM ViewModel",
				"* A thin, fast, dependency-free vdom view layer",
				"* @preserve https://github.com/leeoniya/domvm (2.x-dev)",
				"*/",
				"",
			].join("\n"),
			moduleName: "domvm",
			format: "umd",		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			sourceMap: true,
			dest: "./dist/" + buildName + "/domvm." + buildName + ".js"
		});

		console.log((+new Date - start) + "ms: Rollup + Buble done (build: " + buildName + ")");

		minify(buildName, start);
	})
}

function minify(buildName, start) {
	// --souce_map_input dist/domvm.full.js.map	// --create_source_map dist/domvm.full.min.js.map

	let cmd = [
		"java -jar compiler.jar --language_in=ECMASCRIPT6_STRICT",
		"--js             dist/" + buildName + "/domvm." + buildName + ".js",
		"--js_output_file dist/" + buildName + "/domvm." + buildName + ".min.js",
	].join(" ");

	exec(cmd, function(error, stdout, stderr) {
		console.log((+new Date - start) + "ms: Closure done (build: " + buildName + ")");
		/*
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
	//	fs.writeFileSync('/tmp/fs.tmp', '');
		*/
	});
}