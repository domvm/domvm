QUnit.module("Flat List");

(function() {
	var list = ["a","b","c"];

	function ListView(vm) {
		return function() { return el("ul#list0.test-output", list.map(function(item) { return el("li", item) })); }
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.createView(ListView).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list0");

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 5 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 4 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 6 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 10 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1, nodeValue: 9 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2, nodeValue: 4 });
	});
})();