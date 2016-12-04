const rollup = require('rollup').rollup;
const buble = require('rollup-plugin-buble');
const fs = require('fs');
const exec = require('child_process').exec;
const zlib = require('zlib');

function getBuilds() {
	return [
		{
			build: "pico",
			contents: "view core",
			brings: "dom recycling<br>lifecycle hooks<br>parameterized events & delegation<br>sub-views<br>fragments<br>element injection<br>raw html<br>vnode refs<br>css objects<br>**WARNING: this build's feature set may be reduced without notice**",
		},
		{
			build: "nano",
			contents: "+ `cssTag`<br>+ `autoPx`<br>+ `spreadBody`<br>+ `diff`<br>+ `patch`<br>",
			brings: "tpl conveniences:<br>`\"input[type=checkbox].some-class\"`<br>`{style: {width: 20}}`<br>`el(\"div\", el(\"span\", \"foo\")...)`<br><br>optims:<br>`vnode.patch({class: ..., style...})`<br>`vm.diff({vals:...then:...})`",
		},
		{
			build: "micro",
			contents: "+ `emit`<br> + `vmBody`<br>",
			brings: "subview-to-parent events:<br>`vm.emit('myNotif', arg1, arg2...)`<br><br>get child views:<br>`vm.body()` ",
		},
		{
			build: "mini",
			contents: "+ `streamCfg`<br> + `streamFlyd`<br> + `prop`<br>",
			brings: "view reactivity (reduce need for explicit `redraw()`)",
		},
		{
			build: "small",
			contents: "+ `router`<br>",
			brings: "client-side router",
		},
		{
			build: "full",
			contents: "+ `html`<br> + `attach`<br>",
			brings: "isomorphism & SSR",
		},
	];
}

var args = process.argv.slice(2);

if (args.length == 1)
	compile(args[0]);

function compile(buildName) {
	var start = +new Date;

	var entry = './builds/' + buildName + '.js';
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

		buildDistTable();
	}).catch(function(err) {
		console.log(err);
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

		buildDistTable();

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

function padRight(str, padStr, len) {
	return str + padStr.repeat(len - str.length);
}

// builds markdown table
function buildDistTable() {
	var builds = getBuilds();

	var colWidths = {
		build: 0,
		"min / gz": 0,
		contents: 0,
		brings: 0,
	};

	var appendix = [];

	builds.forEach(function(build, i) {
		var buildName = build.build;

		var path = "dist/" + buildName + "/domvm." + buildName + ".min.js";

		appendix.push("["+(i+1)+"]: https://github.com/leeoniya/domvm/blob/2.x-dev/" + path);

		var minified = fs.readFileSync("./" + path, 'utf8');
		var gzipped = zlib.gzipSync(minified, {level: 6});

		var minLen = (minified.length / 1024).toFixed(1);
		var gzLen = (gzipped.length / 1024).toFixed(1);

		build["min / gz"] = minLen + "k / " + gzLen + "k";
		build.build = "[" + buildName + "][" + (i+1) + "]";

		for (var colName in colWidths)
			colWidths[colName] = Math.max(colWidths[colName], build[colName].length);

	});

	var table = '';

	for (var colName in colWidths)
		table += "| " + padRight(colName, " ", colWidths[colName] + 1);
	table += "|\n";

	for (var colName in colWidths)
		table += "| " + padRight("", "-", colWidths[colName]) + " ";
	table += "|\n";

	builds.forEach(function(build, i) {
		for (var colName in colWidths)
			table += "| " + padRight(build[colName], " ", colWidths[colName] + 1);
		table += "|\n";
	});

	table += "\n" + appendix.join("\n");

	fs.writeFileSync("./dist/README.md", table, 'utf8');
}

module.exports.compile = compile;