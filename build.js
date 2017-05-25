const rollup = require('rollup').rollup;
const replace = require('rollup-plugin-replace');
const buble = require('rollup-plugin-buble');
const uglify = require('rollup-plugin-uglify');
const fs = require('fs');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const zlib = require('zlib');

function getBuilds(name) {
	return [
		{
			build: "pico",
			contents: "dom recycling<br>lifecycle hooks<br>event delegation<br>parameterized handlers<br>sub-views<br>element injection<br>raw html<br>vnode refs<br>css objects<br>svg<br>global onevent",
			descr: "view core<br><br>**This build is unstable by design; features that get decoupled<br>can move to nano+ builds at any commit!**",
			destub: [],
		},
		{
			build: "nano",
			contents: "+ `selectorTag`<br> + `autoPx`<br> + `diff`<br> + `patch`<br>",
			descr: "tpl conveniences:<br>`\"input[type=checkbox].some-class\"`<br>`{style: {width: 20}}`<br>`el(\"div\", el(\"span\", \"foo\")...)`<br><br>optims:<br>`vnode.patch({class: ..., style...})`<br>`vm.diff({vals:...then:...})`",
			destub: ["cssTag","autoPx"],
		},
		{
			build: "micro",
			contents: "+ `emit`<br> + `body`<br>",
			descr: "subview-to-parent events:<br>`vm.emit('myNotif', arg1, arg2...)`<br><br>get child views:<br>`vm.body()` ",
			destub: ["cssTag","autoPx"],
		},
		{
			build: "mini",
			contents: "+ `streamCfg`<br> + `streamFlyd`<br> + `prop`<br>",
			descr: "view reactivity (reduce need for explicit `redraw()`)",
			destub: ["cssTag","autoPx","isStream","hookStream"],
		},
		{
			build: "client",
			contents: "`mini`<br> + `attach`<br>",
			descr: "SSR hydration",
			destub: ["cssTag","autoPx","isStream","hookStream"],
		},
		{
			build: "server",
			contents: "`mini`<br> + `html`<br>",
			descr: "SSR rendering",
			destub: ["cssTag","autoPx","isStream","hookStream"],
		},
		{
			build: "full",
			contents: "`mini`<br> + `attach`<br> + `html`<br>",
			descr: "everything (for tests)",
			destub: ["cssTag","autoPx","isStream","hookStream"],
		},
		{
			build: "dev",
			contents: "`full`<br> + warnings",
			descr: "use this build for development; it contains detection of some<br>anti-patterns that may cause slowness, confusion, errors or<br>undesirable behavior",
			destub: ["cssTag","autoPx","isStream","hookStream"],
		}
	].filter(b => name != null ? b.build === name : true);
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

	var DEVBUILD = buildName === "dev";

	var buildFile = './src/builds/' + buildName + '.js';

	var buildCfg = getBuilds(buildName)[0];

	var destubCfg = {include: './src/view/addons/stubs.js'};

	buildCfg.destub.forEach(fnName => { destubCfg[fnName + "Stub as "] = "" });

	rollup({
		entry: buildFile,
		plugins: [
			replace(destubCfg),
			replace({
				_DEVMODE: DEVBUILD
			}),
			buble(),
			DEVBUILD ? {} : uglify({
				output: {
					comments: function(node, comment) {
						return comment.value.indexOf("https://github.com/leeoniya/domvm") >= 0;
					}
				}
			}),
		],
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
				"*/",
				"// https://github.com/leeoniya/domvm (" + ver + ", " + buildName + ")",
				"",
			].join("\n"),
			moduleName: "domvm",
			format: "umd",		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			sourceMap: true,
			dest: "./dist/" + buildName + "/domvm." + buildName + (DEVBUILD ? "" : ".min") + ".js",
		});

		console.log((+new Date - start) + "ms: Rollup + Buble + Uglify done (build: " + buildName + ")");

		buildDistTable();
	}).catch(function(err) {
		console.log(err);
	})
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

		var DEVBUILD = buildName === "dev";

		var path = "dist/" + buildName + "/domvm." + buildName + (DEVBUILD ? "" : ".min") + ".js";

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