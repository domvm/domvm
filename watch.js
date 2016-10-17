const watch = require('node-watch');
const rollup = require('rollup').rollup;
const buble = require('rollup-plugin-buble');
const fs = require('fs');
const exec = require('child_process').exec;

var cache;

compile();

watch('.', function(file) {
	if (/node_modules|dist|watch\.js|demos|test/.test(file))
		return;
	if (/\.js$/.test(file))
		compile();
});

function compile() {
	var start = +new Date;

	rollup({
		entry: './src/index.js',
	//	cache: cache,
		plugins: [ buble() ],
	})
	.then(function(bundle) {
		bundle.write({
			moduleName: "domvm",
			format: 'umd',		 // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
			sourceMap: true,
			dest: './dist/domvm.js'
		});

		console.log((+new Date - start) + "ms: Rollup + Buble done");

	//	cache = bundle;

		minify(start);
	})
}

function minify(start) {
	// --souce_map_input dist/domvm.js.map	// --create_source_map dist/domvm.min.js.map

	let cmd = "java -jar compiler.jar --language_in=ECMASCRIPT6_STRICT --js dist/domvm.js --js_output_file dist/domvm.min.js";

	exec(cmd, function(error, stdout, stderr) {
		console.log((+new Date - start) + "ms: Closure done");
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