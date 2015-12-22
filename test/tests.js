domvm.useRaf = false;
var instr = new DOMInstr();

var testyDiv = document.getElementById("testy");

function evalOut(assert, viewEl, genrHtml, expcHtml, actuCounts, expcCounts) {
	var wrap = document.createElement("div");
	wrap.innerHTML = expcHtml;

	assert.equal(genrHtml, expcHtml, "domvm.html(): " + genrHtml);
	assert.ok(viewEl.isEqualNode(wrap.firstChild), "DOM HTML: " + viewEl.outerHTML);
	assert.deepEqual(actuCounts, expcCounts, "DOM Ops: " + JSON.stringify(expcCounts));
}

function anonView(branchDef) {
	return function AnonView(vm, data) {
		return {
			render: function() {
				return branchDef;
			}
		}
	}
}

QUnit.module("Flat List");

(function() {
	var list = ["a","b","c"];

	function ListView(vm) {
		return {
			render: function() {
				return ["ul#list0.test-output", list.map(function(item) {
					return ["li", item];
				})];
			}
		};
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm(ListView).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list0");

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
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


QUnit.module("Flat List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed() {
		return {
			render: function() {
				return ["ul#list1.test-output", list.map(function(item) {
				//	return ["li$"+item, item];						// why no workie?
					return ["li", {_key: item}, item];
				})];
			}
		};
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm(ListViewKeyed).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list1");

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
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
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 9 });
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
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2 });
	});
})();

QUnit.module("Other mods");

(function() {
	var tpl;

	function View(vm) {
		return {
			render: function() {
				return tpl;
			}
		}
	}

	QUnit.test('(root) span -> a', function(assert) {
		tpl = ["span", "foo"];
		var expcHtml = '<span>foo</span>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		tpl = ["a", {href: "#"}, "bar"];
		var expcHtml = '<a href="#">bar</a>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, setAttribute: 1, replaceChild: 1, textContent: 1 });
	});

	QUnit.test('(child) span -> a', function(assert) {
		tpl = ["div", [["span", "foo"]]];
		var expcHtml = '<div><span>foo</span></div>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		tpl = ["div", [["a", {href: "#"}, "bar"]]];
		var expcHtml = '<div><a href="#">bar</a></div>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createElement: 1, setAttribute: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('(body) [] -> text', function(assert) {
		tpl = ["span", [["em","moo"], " ", ["em","cow"]]];
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = ["span", "moo cow"];
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { textContent: 1 });
	});

	QUnit.test('(body) text -> []', function(assert) {
		tpl = ["span", "moo cow"];
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		tpl = ["span", [["em","moo"], " ", ["em","cow"]]];
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 3, createTextNode: 1, insertBefore: 3 });
	});

	QUnit.test('(body) textNode -> elem', function(assert) {
		tpl = ["span", [
			["em", "foo"],
			" bar ",
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = ["span", [
			["em", "foo"],
			["br"],
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createElement: 1, insertBefore: 1 });
	});

	QUnit.test('(body) elem -> textNode', function(assert) {
		tpl = ["span", [
			["em", "foo"],
			["br"],
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		var vm = domvm(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 4, textContent: 2, insertBefore: 4 });

		tpl = ["span", [
			["em", "foo"],
			" bar ",
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createTextNode: 1, insertBefore: 1 });
	});
})();


QUnit.module("Subview List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed(vm, list) {
		return {
			render: function() {
				return ["ul#list2.test-output", list.map(function(item) {
					return [ListViewItem, item, item];
				})];
			}
		};
	}

	function ListViewItem(vm, item, _key) {
		return {
			render: function() {
				return ["li", item];		// {_key: item}
			}
		};
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm(ListViewKeyed, list).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list2");

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

/*	these tests are unfair because the changed value is also the key, meaning that the sub-view is replaced
	but expected DOM ops expect full re-use of removed view. this is a TODO, but an unrealistic scenario

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});
*/
	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
//		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 9 });
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { insertBefore: 7 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2 });
	});
})();



QUnit.module("Attrs/Props");

(function() {
	// a checkbox component
	function Check(id, checked) {
		this.id = id;
		this.checked = checked;

	//	this.view = [CheckView, this];
	}

	function CheckView(vm, check) {
		check.vm = vm;
		return {
			render: function() {
				return ["input#" + check.id, {type: "checkbox", checked: check.checked}];
			}
		};
	};

	var check1 = new Check("check1", false);
	var check2 = new Check("check2", true);

	QUnit.test("Bool attr init false", function(assert) {
		instr.start();
		domvm(CheckView, check1).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, check1.vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 1 });
	});

	QUnit.test("Bool attr toggle true", function(assert) {
		check1.checked = true;

		instr.start();
		check1.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" checked id="check1">';
		evalOut(assert, checkEl, check1.vm.html(), expcHtml, callCounts, { setAttribute: 1 });
	});

	QUnit.test("Bool attr init true", function(assert) {
		instr.start();
		domvm(CheckView, check2).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" checked id="check2">';
		evalOut(assert, checkEl, check2.vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 2 });
	});

	QUnit.test("Bool attr toggle false", function(assert) {
		check2.checked = false;

		instr.start();
		check2.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, check2.vm.html(), expcHtml, callCounts, { removeAttribute: 1 });
	});
})();

// TODO: assert triple equal outerHTML === vm.html() === hardcoded html
// does not test the .html() func or accurate tree creation

QUnit.module("Elems & id/class");

(function() {
	QUnit.test('Empty elem: ["div"]', function(assert) {
		var tpl = ["div"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('Text body: ["div", "moo"]', function(assert) {
		var tpl = ["div", "moo"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>moo</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Void elem: ["input"]', function(assert) {
		var tpl = ["input"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<input>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('SVG elem: ["svg"]', function(assert) {
		var tpl = ["svg"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<svg></svg>';		// should include xlink & xmlns?
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElementNS: 1, insertBefore: 1 });
	});


	QUnit.test('["div#foo.class1.class2"]', function(assert) {
		var tpl = ["div#foo.class1.class2"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('["#foo.class1.class2"]', function(assert) {
		var tpl = ["#foo.class1.class2"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('[".class1.class2"]', function(assert) {
		var tpl = ["div.class1.class2"];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('Style Obj (camelCase)', function(assert) {
		var tpl = ["div", {style: { backgroundColor: "red" }}];

		instr.start();
		var vm = domvm(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div style="background-color: red;"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});
})();

QUnit.module("Subview redraw() Branch Consistency");

(function() {
	function Parent() {
		this.kids = [];

		var ctx = this;
		this.view = function ParentView(vm) {
			// viewState should be closured here, and this func only called once
			ctx.vm = vm;
			return {
				render: function() {
					return ["ul", ctx.kids.map((kid) => kid.view)];
				}
			}
		}
	}

	function Child(name) {
		this.name = name;

		var ctx = this;
		this.view = function ChildView(vm) {
			// viewState should be closured here, and this func only called once
			ctx.vm = vm;
			return {
				render: function() {
					return ["li", ctx.name];
				}
			}
		}
	}

	var mom = new Parent();
	mom.kids.push(new Child("Billy"));

	var vm, vm2;
//	var vm2 =	// how to get .html?

	QUnit.test('Proper initial HTML', function(assert) {
		var expcHtml = '<ul><li>Billy</li></ul>';

		instr.start();
		vm = domvm(mom.view).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('update child -> redraw child -> redraw parent', function(assert) {
		mom.kids[0].name = "Johnny";

		instr.start();
		mom.kids[0].vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Johnny</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	QUnit.test('update child -> redraw parent -> redraw child', function(assert) {
		mom.kids[0].name = "Chuck Norris";

		instr.start();
		mom.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Chuck Norris</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.kids[0].vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	// TODO: also with passed-in data
})();

QUnit.module("after()");

(function() {
	QUnit.test('after() is called on self', function(assert) {
		assert.expect(1);

		var done = assert.async();

		function MyView(vm) {
			// viewState should be closured here, and this func only called once
			return {
				after: function() {
					assert.ok(true, "Self after()");
				},
				render: function() {
					return ["span", "foo"];
				}
			}
		}

		var vm = domvm(MyView).mount(testyDiv);

		setTimeout(done, 1);
	});

	QUnit.test('after() is called on subviews when parent redraws', function(assert) {
		assert.expect(2);

		var done = assert.async();

		function MyView(vm) {
			// viewState should be closured here, and this func only called once
			return {
				after: function() {
					assert.ok(true, "Parent after()");
				},
				render: function() {
					return ["span", [MyView2]];
				}
			}
		}

		function MyView2(vm) {
			// viewState should be closured here, and this func only called once
			return {
				after: function() {
					assert.ok(true, "Child after()");
				},
				render: function() {
					return ["span", "foo"];
				}
			}
		}

		var vm = domvm(MyView).mount(testyDiv);

		setTimeout(done, 1);
	});
})();