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
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
	//	["z","bar","a",666,"moo","xxx","zzz","b","c","baz",10] ->
	//	[10,666,"a","b","bar","baz","c","moo","xxx","z","zzz"]

		list.sort();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 9 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
	//	[666, "a", "b", "bar", "baz", "c", "moo", "xxx", "z"] ->
	//	[666, "a", "b", "c", "moo", "xxx", "z"]

		list.splice(3,2);

		instr.start();
		vm.redraw(true);
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
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.test("Move first to end", function(assert) {
	//	["z", 666, "a", "b", "c", "moo", "xxx"] ->
	//	[666, "a", "b", "c", "moo", "xxx", "z"]

		list.push(list.shift());

		instr.start();
		vm.redraw(true);
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
		vm.redraw(true);
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
		vm.redraw(true);
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
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>c</li><li>b</li><li>a</li><li>xxx</li><li>moo</li><li>666</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.skip("Swap nested", function(assert) {});
	QUnit.skip("move two adjacent up", function(assert) {});
	QUnit.skip("move two adjacent down", function(assert) {});
	QUnit.skip("move two disjoint up", function(assert) {});
	QUnit.skip("move two disjoint down", function(assert) {});

	// TODO: soundness: odd vs even lists
	// TODO: coverage: test hydrating from right after hitting impasse on left
	// TODO: coverage: ensure sortDOM is hit
})();