const rollup = require('rollup').rollup;
const replace = require('rollup-plugin-replace');
const fs = require('fs');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const zlib = require('zlib');
const Terser = require('terser');

const AVAIL_FEATS = [
	"FLUENT_API",
	"LAZY_LIST",
	"PARSE_TAG",
	"STATIC_CLASS",
	"AUTO_KEY",
	"SPL_ATTRS",
	"PROP_ATTRS",
	"EVENT_DELEG",
	"ONEVENT",
	"DIFF_CMP",
	"FOREIGN_ELEMS",
	"RAF_REDRAW",
	"AUTO_PX",
	"EMIT",
	"STREAM",
/*
	"HOOKS",		// deep_notify_remove, etc
    "EVENT_ATTRS",	// EVENT_PARAMS
	"REFS",
	"PREPROC_FLATTEN",
	"PREPROC_MERGE_TEXT",
	"PREPROC_REMOVE_FALSEY",
	"DIFF_CMP",	// else diff just returns true/false
	"SPREAD_BODY",
	"PARTIAL_KEYS"
	// exhaustive donor search
	// styles, hooks, attrs, events
*/
];

function getBuilds(name) {
	const pico = {
		build: "pico",
		contents: "fluent api<br>dom recycling<br>lifecycle hooks<br>parameterized handlers<br>sub-views<br>element injection<br>innerHTML<br>vnode refs<br>css objects<br>svg<br>diff<br>lazy list<br>",
		descr: "view core<br><br>**This build is unstable by design; features that get decoupled<br>can move to nano+ builds at any commit!**",
		feats: ["FLUENT_API","LAZY_LIST"],
	};

	const nano = {
		build: "nano",
		contents: "- fluent api<br>+ special attrs<br>+ prop attrs<br>+ tag parsing<br>+ vnode patching<br>+ class merging<br>+ auto keying<br>+ global onevent<br>+ object/array diff<br>+ foreign elem skipping<br>+ raf-debounced redraw",
		descr: "`\"input[type=checkbox].some-class\"`<br>`vnode.patch({class: ..., style...})`",
		feats: [
			"LAZY_LIST",
			"PARSE_TAG",
			"STATIC_CLASS",
			"AUTO_KEY",
			"SPL_ATTRS",
			"PROP_ATTRS",
			"ONEVENT",
			"DIFF_CMP",
			"FOREIGN_ELEMS",
			"RAF_REDRAW",
		],
	};

	const micro = {
		build: "micro",
		contents: "+ `emit`<br> + `body`<br> + `autoPx`<br> + `defineElementSpread`<br> + `defineSvgElementSpread`<br>",
		descr: "`vm.emit('myNotif', arg1, arg2...)`<br>`vm.body()`<br>`{style: {width: 20}}`",
		feats: nano.feats.concat("AUTO_PX","EMIT"),
	};

	const mini = {
		build: "mini",
		contents: "+ `stream`<br>",
		descr: "view reactivity",
		feats: micro.feats.concat("STREAM"),
	};

	const client = {
		build: "client",
		contents: "`mini`<br> + `attach`<br>",
		descr: "SSR hydration",
		feats: mini.feats,
	};

	const server = {
		build: "server",
		contents: "`mini`<br> + `html`<br>",
		descr: "SSR rendering",
		feats: mini.feats,
	};

	const full = {
		build: "full",
		contents: "`mini`<br> + `attach`<br> + `html`<br>",
		descr: "all the bells and whistles",
		feats: mini.feats,
	};

	const dev = {
		build: "dev",
		contents: "`full`<br> + warnings<br>",
		descr: "use this build for development; it contains detection of some<br>anti-patterns that may cause slowness, confusion, errors or<br>undesirable behavior",
		feats: mini.feats,
	};

	return [pico, nano, micro, mini, client, server, full, dev].filter(b => name != null ? b.build === name : true);
}

var args = process.argv.slice(2);
var buildName = args[0];
builds = buildName == null ? getBuilds().map(b => b.build) : [buildName];
builds.forEach(b => compile(b));

function getCurBranch() {
	var branches = execSync("git branch", {encoding: 'utf8'});
	return branches.match(/^\*.*$/gm)[0].substr(2);
}

function compile(buildName) {
	var start = +new Date;

	var buildFile = './src/builds/' + buildName + '.js';

	var buildCfg = getBuilds(buildName)[0];

	var feats = buildCfg.feats;

	var repls = {
		_DEVMODE: buildName === "dev",
	};

	AVAIL_FEATS.forEach(function(f) {
		repls["FEAT_" + f] = feats.indexOf(f) != -1;
	});

	rollup({
		input: buildFile,
		onwarn: (warning, warn) => {
			if (warning.code === 'CIRCULAR_DEPENDENCY')
				return;
			warn(warning)
		},
		plugins: [
			replace(repls),
		],
	})
	.then(function(bundle) {
		var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
		var branch = getCurBranch();

		var ver = branch.indexOf("-dev") != -1 ? branch : "v" + pkg.version;

		var preserve = "https://github.com/domvm/domvm (" + ver + ", " + buildName + " build)";

		var banner = [
			"/**",
			"* Copyright (c) " + new Date().getFullYear() + ", Leon Sorokin",
			"* All rights reserved. (MIT Licensed)",
			"*",
			"* domvm.js (DOM ViewModel)",
			"* A thin, fast, dependency-free vdom view layer",
			"* @preserve " + preserve,
			"*/",
			"",
		].join("\n");

		bundle.write({
			banner: banner,
			name: "domvm",
			format: "es",		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			esModule: false,
		//	sourcemap: true,
			file: "./dist/" + buildName + "/domvm." + buildName + ".es.js"
		});

		bundle.write({
			banner: banner,
			name: "domvm",
			format: "cjs",		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			esModule: false,
			sourcemap: buildName == 'full',
			file: "./dist/" + buildName + "/domvm." + buildName + ".cjs.js"
		});

		bundle.write({
			banner: banner,
			name: "domvm",
			format: "iife",		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			esModule: false,
			sourcemap: buildName == 'full',
			file: "./dist/" + buildName + "/domvm." + buildName + ".iife.js"
		}).then(b => {
			console.log((+new Date - start) + "ms: Rollup done (build: " + buildName + ")");
			squish(buildName, preserve, start);
		});
	}).catch(function(err) {
		console.log(err);
	})
}

async function squish(buildName, preserve, start) {
	var src = "dist/" + buildName + "/domvm." + buildName + ".iife.js";
	var dst = "dist/" + buildName + "/domvm." + buildName + ".iife.min.js";

	const opts = {
		compress: {
			inline: 0,
			passes: 2,
			keep_fargs: false,
			pure_getters: true,
			unsafe: true,
			unsafe_comps: true,
			unsafe_math: true,
			unsafe_undefined: true,
		},
		output: {
			comments: /^!/,
		}
	};

	const compiled = await Terser.minify(fs.readFileSync(src, 'utf8'), opts);

	fs.writeFileSync(dst, "// " + preserve + "\n" + compiled.code, 'utf8');

	buildDistTable();

	console.log((+new Date - start) + "ms: Terser done (build: " + buildName + ")");
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

		var path = "dist/" + buildName + "/domvm." + buildName + ".iife.min.js";

		appendix.push("["+(i+1)+"]: https://github.com/domvm/domvm/blob/" + branch + "/" + path);

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