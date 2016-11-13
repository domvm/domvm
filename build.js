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

	var entry = './dist/builds/' + buildName + '.js';
	var stubs = './src/view/addons/stubs.js';

	// will hold contents of orig stubs.js
	var stubsOrig, stubsNew;

	var entryData = fs.readFileSync(entry, 'utf8');

	var destub = /#destub: ([\w,]+)/gm.exec(entryData);

	if (destub) {
		stubsOrig = stubsNew = fs.readFileSync(stubs, 'utf8');

		destub[1].split(",").forEach(function(fnName) {
			stubsNew = stubsNew.replace(fnName + "Stub as ", "");
		});

		fs.writeFileSync(stubs, stubsNew, 'utf8');
	}

	rollup({
		entry: entry,
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

		if (destub)
			fs.writeFileSync(stubs, stubsOrig, 'utf8');

		console.log((+new Date - start) + "ms: Rollup + Buble done (build: " + buildName + ")");

		minify(buildName, start);
	}).catch(function(err) {
		if (destub)
			fs.writeFileSync(stubs, stubsOrig, 'utf8');
	})
}

function minify(buildName, start) {
	// --souce_map_input dist/domvm.full.js.map	// --create_source_map dist/domvm.full.min.js.map

	var src = "dist/" + buildName + "/domvm." + buildName + ".js";
	var dst = "dist/" + buildName + "/domvm." + buildName + ".min.js";

	let cmd = [
		"java -jar compiler.jar --language_in=ECMASCRIPT6_STRICT",
		"--js             " + src,
		"--js_output_file " + dst,
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