const rollup = require('rollup').rollup;
const buble = require('rollup-plugin-buble');
const fs = require('fs');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const zlib = require('zlib');

function getBuilds() {
	return [
		{
			build: "pico",
			contents: "dom recycling<br>lifecycle hooks<br>event delegation<br>parameterized handlers<br>sub-views<br>element injection<br>raw html<br>vnode refs<br>css objects<br>svg<br>global onevent",
			descr: "view core<br><br>**This build is unstable by design; features that get decoupled<br>can move to nano+ builds at any commit!**",
		},
		{
			build: "nano",
			contents: "+ `h`<br>+ `selectorTag`<br>+ `autoPx`<br>+ `defineElementSpread`<br>+ `diff`<br>+ `patch`<br>",
			descr: "tpl conveniences:<br>`\"input[type=checkbox].some-class\"`<br>`{style: {width: 20}}`<br>`el(\"div\", el(\"span\", \"foo\")...)`<br><br>optims:<br>`vnode.patch({class: ..., style...})`<br>`vm.diff({vals:...then:...})`",
		},
		{
			build: "micro",
			contents: "+ `emit`<br> + `body`<br>",
			descr: "subview-to-parent events:<br>`vm.emit('myNotif', arg1, arg2...)`<br><br>get child views:<br>`vm.body()` ",
		},
		{
			build: "mini",
			contents: "+ `streamCfg`<br> + `streamFlyd`<br> + `prop`<br>",
			descr: "view reactivity (reduce need for explicit `redraw()`)",
		},
		{
			build: "client",
			contents: "`mini`<br> + `attach`<br>",
			descr: "SSR hydration",
		},
		{
			build: "server",
			contents: "`mini`<br> + `html`<br>",
			descr: "SSR rendering",
		},
		{
			build: "full",
			contents: "`mini`<br> + `attach`<br> + `html`<br>",
			descr: "everything (for tests/debug)",
		}
	];
}

var args = process.argv.slice(2);

if (args.length == 1)
	compile(args[0]);

function getCurBranch() {
	var branches = execSync("git branch", {encoding: 'utf8'});
	return branches.match(/^\*.*$/gm)[0].substr(2);
}

function compile(buildName) {
	var start = +new Date;

	var entry = './src/builds/' + buildName + '.js';
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
		var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
		var branch = getCurBranch();

		var ver = branch.indexOf("-dev") != -1 ? branch : "v" + pkg.version;

		bundle.write({
			banner: [
				"/**",
				"* Copyright (c) " + new Date().getFullYear() + ", Leon Sorokin",
				"* All rights reserved. (MIT Licensed)",
				"*",
				"* domvm.full.js - DOM ViewModel",
				"* A thin, fast, dependency-free vdom view layer",
				"* @preserve https://github.com/leeoniya/domvm (" + ver + ", " + buildName + ")",
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
		console.log(err);
		if (destub)
			fs.writeFileSync(stubs, stubsOrig, 'utf8');
	})
}

function minify(buildName, start) {
	// --souce_map_input dist/domvm.full.js.map	// --create_source_map dist/domvm.full.min.js.map

	var src = "dist/" + buildName + "/domvm." + buildName + ".js";
	var dst = "dist/" + buildName + "/domvm." + buildName + ".min.js";
//	var mapName = "domvm." + buildName + ".min.js.map";
//	var dstMap = "dist/" + buildName + "/" + mapName;

	let cmd = [
		"java -jar compiler.jar --language_in=ECMASCRIPT6_STRICT --language_out ECMASCRIPT5_STRICT",
		"--js             " + src,
		"--js_output_file " + dst,
	//	"--create_source_map " + dstMap,
	//	"--source_map_include_content",
	//	'--output_wrapper "%output%\n//# sourceMappingURL=' + mapName + '"',
	].join(" ");

	exec(cmd, function(error, stdout, stderr) {
		console.log((+new Date - start) + "ms: Closure done (build: " + buildName + ")");

	//	fs.writeFileSync(dst, fs.readFileSync(dst, 'utf8') + "//# sourceMappingURL="+mapName, 'utf8');
	//	fs.writeFileSync(dstMap, fs.readFileSync(dstMap, 'utf8').replace(/dist\/nano\//g, ""), 'utf8');

		// remove "window.moo = moo;" patterns inserted to prevent gcc inlining.
		fs.writeFileSync(dst, fs.readFileSync(dst, 'utf8').replace(/window\.\w+\s*=\s*\w+;/gmi, ""), 'utf8');

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

	var branch = getCurBranch();

	var colWidths = {
		build: 0,
		"min / gz": 0,
		contents: 0,
		descr: 0,
	};

	var appendix = [];

	builds.forEach(function(build, i) {
		var buildName = build.build;

		var path = "dist/" + buildName + "/domvm." + buildName + ".min.js";

		appendix.push("["+(i+1)+"]: https://github.com/leeoniya/domvm/blob/" + branch + "/" + path);

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