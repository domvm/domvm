QUnit.module("Flat List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed(vm) {
		return function() { return el("ul#list1.test-output", list.map(function(item) { return el("li", {_key: item}, item); })); }
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.createView(ListViewKeyed).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list1");

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
	//	["z","bar","a",666,"moo","xxx","zzz","b","c","baz",10] ->
	//	[10,666,"a","b","bar","baz","c","moo","xxx","z","zzz"]

		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 7 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
	//	[666, "a", "b", "bar", "baz", "c", "moo", "xxx", "z"] ->
	//	[666, "a", "b", "c", "moo", "xxx", "z"]

		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2 });
	});

	// TODO: test

	QUnit.test("Move last to front", function(assert) {
	//	[666, "a", "b", "c", "moo", "xxx", "z"] ->
	//	["z", 666, "a", "b", "c", "moo", "xxx"]

		list.unshift(list.pop());

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.test("Move first to end", function(assert) {
	//	["z", 666, "a", "b", "c", "moo", "xxx"] ->
	//	[666, "a", "b", "c", "moo", "xxx", "z"]

		list.push(list.shift());

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.test("Swap first/last", function(assert) {
	//	[666, "a", "b", "c", "moo", "xxx", "z"] ->
	//	["z", "a", "b", "c", "moo", "xxx", 666]

		var a = list[0];
		var b = list[list.length - 1];

		list[0] = b;
		list[list.length - 1] = a;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	QUnit.test("Swap middle (non-adj)", function(assert) {
	//	["z", "a", "b", "c", "moo", "xxx", 666] ->
	//	["z", "c", "b", "a", "moo", "xxx", 666]

		var a = list[1];
		var b = list[3];

		list[1] = b;
		list[3] = a;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>c</li><li>b</li><li>a</li><li>moo</li><li>xxx</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	QUnit.test("Swap middle (adj)", function(assert) {
	//	["z", "c", "b", "a", "moo", "xxx", 666] ->
	//	["z", "c", "b", "a", "xxx", "moo", 666]

		var a = list[4];
		var b = list[5];

		list[4] = b;
		list[5] = a;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>c</li><li>b</li><li>a</li><li>xxx</li><li>moo</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.test("Swap nested", function(assert) {
	//	["z", "c", "b", "a", "xxx", "moo", 666] ->
	//	["z", "moo", "xxx", "a", "b", "c", 666]

		list.length = 0;
		list.push("z", "moo", "xxx", "a", "b", "c", 666);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>moo</li><li>xxx</li><li>a</li><li>b</li><li>c</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 4 });
	});

	QUnit.test("move two adjacent up", function(assert) {
	//	["z", "moo", "xxx", "a", "b", "c", 666] ->
	//	["z", "a", "b", "moo", "xxx", "c", 666]

		list.length = 0;
		list.push("z", "a", "b", "moo", "xxx", "c", 666);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>a</li><li>b</li><li>moo</li><li>xxx</li><li>c</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	// optimal should be only 2 ops
	QUnit.test("move two adjacent down", function(assert) {
	//	["z", "a", "b", "moo", "xxx", "c", 666] ->
	//	["b", "moo", "xxx", "z", "a", "c", 666]

		list.length = 0;
		list.push("b", "moo", "xxx", "z", "a", "c", 666);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>b</li><li>moo</li><li>xxx</li><li>z</li><li>a</li><li>c</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	QUnit.test("move two disjoint up", function(assert) {
	//	["b", "moo", "xxx", "z", "a", "c", 666] ->
	//	["b", "xxx", "moo", "a", "z", "c", 666]

		list.length = 0;
		list.push("b", "xxx", "moo", "a", "z", "c", 666);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>b</li><li>xxx</li><li>moo</li><li>a</li><li>z</li><li>c</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	QUnit.test("move two disjoint down", function(assert) {
	//	["b", "xxx", "moo", "a", "z", "c", 666] ->
	//	["b", "moo", "xxx", "z", "a", "c", 666]

		list.length = 0;
		list.push("b", "moo", "xxx", "z", "a", "c", 666);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>b</li><li>moo</li><li>xxx</li><li>z</li><li>a</li><li>c</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	// snabbdom worst case
	QUnit.test("move first and second-to-last to end", function(assert) {
	//	["b", "moo", "xxx", "z", "a", "c", 666] ->
	//	["moo", "xxx", "z", "a", 666, "b", "c"]

		list.length = 0;
		list.push("moo", "xxx", "z", "a", 666, "b", "c");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>moo</li><li>xxx</li><li>z</li><li>a</li><li>666</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	// snabbdom worst case + insert & delete
	QUnit.test("move first and second-to-last to end", function(assert) {
	//	["moo", "xxx", "z", "a", 666, "b", "c"] ->
	//	["xxx", "z", "y", 666, "c", "moo", "b"]

		list.length = 0;
		list.push("xxx", "z", "y", 666, "c", "moo", "b");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>xxx</li><li>z</li><li>y</li><li>666</li><li>c</li><li>moo</li><li>b</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 3, createElement: 1, textContent: 1, removeChild: 1 });
	});

	// reverse list
	QUnit.test("reverse", function(assert) {
	//	["xxx", "z", "y", 666, "c", "moo", "b"] ->
	//	["b", "moo", "c", 666, "y", "z", "xxx"]

		list.length = 0;
		list.push("b", "moo", "c", 666, "y", "z", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>b</li><li>moo</li><li>c</li><li>666</li><li>y</li><li>z</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 6 });
	});

/*
	// mostly benchmark tests https://github.com/localvoid/uibench-base/blob/master/lib/uibench.ts#L302-L322

	// special use case that should trigger worst case scenario for kivi library
	testCase("tree/[50]/[kivi_worst_case]", tree50, scuClone(
		treeTransform(treeTransform(treeTransform(tree50, [removeFirst(1)]), [removeLast(1)]), [reverse]))),

	// special use case that should trigger worst case scenario for snabbdom library
	testCase("tree/[50]/[snabbdom_worst_case]", tree50, scuClone(
		treeTransform(tree50, [snabbdomWorstCase]))),

	// special use case that should trigger worst case scenario for react library
	testCase("tree/[50]/[react_worst_case]", tree50, scuClone(
		treeTransform(treeTransform(treeTransform(tree50,
			[removeFirst(1)]),
			[removeLast(1)]),
			[moveFromEndToStart(1)]))),

	// special use case that should trigger worst case scenario for virtual-dom library
	testCase("tree/[50]/[virtual_dom_worst_case]", tree50,
		scuClone(treeTransform(tree50, [moveFromStartToEnd(2)]))),

	// test case with large amount of vnodes to test diff overhead
		testCase("tree/[10,10,10,2]/no_change", tree10_10_10_2, scuClone(tree10_10_10_2)),
*/

	// TODO: soundness: odd vs even lists
	// TODO: coverage: test hydrating from right after hitting impasse on left
	// TODO: coverage: ensure sortDOM is hit
})();