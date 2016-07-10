domvm.view.config({ debounce: false });

var instr = new DOMInstr();

var testyDiv = document.getElementById("testy");

function evalOut(assert, viewEl, genrHtml, expcHtml, actuCounts, expcCounts, actuProps, expcProps) {
	var wrap = document.createElement("div");
	wrap.innerHTML = expcHtml;

	assert.equal(genrHtml, expcHtml, "domvm.html(): " + genrHtml);
	assert.ok(viewEl.isEqualNode(wrap.firstChild), "DOM HTML: " + viewEl.outerHTML);
	assert.deepEqual(actuCounts, expcCounts, "DOM Ops: " + JSON.stringify(expcCounts));
	actuProps && assert.deepEqual(actuProps, expcProps, "DOM Props: " + JSON.stringify(expcProps));
}

function anonView(tpl) {
	return function AnonView(vm, model) {
		return function() {
			return tpl;
		};
	}
}

QUnit.module("Prop/attr mutation");

(function() {
	function View() {
		return function() { return tpl; }
	}

	var vm, tpl;

	// todo dataMoo or deep ".dataset.*" .value? console.log(vm.node.el.onclick._fn);
	QUnit.test("Create", function(assert) {
		var onclick = function() {};
		tpl = ["input#foo.bar.baz", {type: "text", style: {fontFamily: "Arial", fontSize: 12}, disabled: true, custom: "abc", custom2: null, custom3: "", custom4: "foo", onclick: onclick}];

		instr.start();
		vm = domvm.view(View).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<input type="text" disabled custom="abc" custom3="" custom4="foo" id="foo" class="bar baz" style="font-family: Arial; font-size: 12px;">';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { id: 1, className: 1, createElement: 1, insertBefore: 1, setAttribute: 5 });
	});

	// TODO: can 'id' or 'name' be allowed to change for recycling since they implicitly double as keys?
	// TODO: can any form elements be reused if non-matching type?
	QUnit.test("Update", function(assert) {
		var onclick = function() {};
		tpl = ["input#foo", {type: "text", style: {padding: 10}, disabled: false, custom: "xyz", custom2: "...", custom4: null}];

		instr.start();
		vm.redraw();		// todo: create test container
		var callCounts = instr.end();

		// a bit of a hack to get the outerHtml to match exactly fo the test
		// domvm sets className="" for perf rather than removeAttribute("class")
		if (vm.node.el.className === "")
			vm.node.el.removeAttribute("class");

		var expcHtml = '<input type="text" custom="xyz" custom2="..." id="foo" style="padding: 10px;">';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { className: 1, removeAttribute: 3, setAttribute: 2 });
	});
})();

QUnit.module("Flat List");

(function() {
	var list = ["a","b","c"];

	function ListView(vm) {
		return function() { return ["ul#list0.test-output", list.map(function(item) { return ["li", item] })]; }
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.view(ListView).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list0");

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 5 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 4 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 6 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 10 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1, nodeValue: 9 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 2, nodeValue: 4 });
	});
})();


QUnit.module("Flat List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed() {
		return function() { return ["ul#list1.test-output", list.map(function(item) { return ["li", {_key: item}, item]; })]; }
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.view(ListViewKeyed).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list1");

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { insertBefore: 9 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list1" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 2 });
	});
})();

QUnit.module("Other mods");

(function() {
	var tpl;

	function View(vm) {
		return function() { return tpl; };
	}

	QUnit.test('flatten arrays of arrays', function(assert) {
		var items = ["a","b","c"];

		tpl = ["div", [
			items.map(function(item) { return ["div", item]; }),
			["br"],
		]];
		var expcHtml = '<div><div>a</div><div>b</div><div>c</div><br></div>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 5, insertBefore: 5, textContent: 3 });
	});

	QUnit.test('(root) span -> a', function(assert) {
		tpl = ["span", "foo"];
		var expcHtml = '<span>foo</span>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		tpl = ["a", {href: "#"}, "bar"];
		var expcHtml = '<a href="#">bar</a>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, setAttribute: 1, removeChild: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('(child) span -> a', function(assert) {
		tpl = ["div", [["span", "foo"]]];
		var expcHtml = '<div><span>foo</span></div>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		tpl = ["div", [["a", {href: "#"}, "bar"]]];
		var expcHtml = '<div><a href="#">bar</a></div>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1, createElement: 1, setAttribute: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('(body) [] -> text', function(assert) {
		tpl = ["span", [["em","moo"], " ", ["em","cow"]]];
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = ["span", "moo cow"];
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { textContent: 1 });
	});

	QUnit.test('(body) text -> []', function(assert) {
		tpl = ["span", "moo cow"];
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		tpl = ["span", [["em","moo"], " ", ["em","cow"]]];
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, textContent: 3, createTextNode: 1, insertBefore: 3 });
	});

	QUnit.test('(body) textNode -> elem', function(assert) {
		tpl = ["span", [
			["em", "foo"],
			" bar ",
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

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
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1, createElement: 1, insertBefore: 1 });
	});

	QUnit.test('(body) elem -> textNode', function(assert) {
		tpl = ["span", [
			["em", "foo"],
			["br"],
			["strong", "baz"],
		]];
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 4, textContent: 2, insertBefore: 4 });

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
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1, createTextNode: 1, insertBefore: 1 });
	});
/*
	QUnit.test('Model as node _key', function(assert) {
		var model = {text: "a"};

		function View() {
			return function() {
				return ["div", ["p", {_key: model}, model.text]];
			};
		}

		var expcHtml = '<div><p>a</p></div>';

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, textContent: 1, insertBefore: 2 });

		// swap model, should kill off node
		model = {text: "b"};

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p>b</p></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, removeChild: 1, textContent: 1, insertBefore: 1 });
	});
*/
})();


QUnit.module("Subview List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed(vm, list) {
		return function() { return ["ul#list2.test-output", list.map(function(item) { return [ListViewItem, item, item]; })]; };
	}

	function ListViewItem(vm, item, key) {
		return function() { return ["li", item]; };		// {_key: item}
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.view(ListViewKeyed, list).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list2");

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
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
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});
*/
	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
//		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { insertBefore: 9 });
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li><li>zzz</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { insertBefore: 7 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 2 });
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
		return function() { return ["input#" + check.id, {type: "checkbox", checked: check.checked}]; };
	};

	var check1 = new Check("check1", false);
	var check2 = new Check("check2", true);
	var check3 = new Check("check3", true);

	QUnit.test("Bool attr init false", function(assert) {
		instr.start();
		domvm.view(CheckView, check1).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, domvm.html(check1.vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Bool attr toggle true", function(assert) {
		check1.checked = true;

		instr.start();
		check1.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" checked id="check1">';
		evalOut(assert, checkEl, domvm.html(check1.vm.node), expcHtml, callCounts, { setAttribute: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr init true", function(assert) {
		instr.start();
		domvm.view(CheckView, check2).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" checked id="check2">';
		evalOut(assert, checkEl, domvm.html(check2.vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 2 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr toggle false", function(assert) {
		check2.checked = false;

		instr.start();
		check2.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, domvm.html(check2.vm.node), expcHtml, callCounts, { removeAttribute: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Dynamic props, always sync vtree -> DOM prop", function(assert) {
		instr.start();
		domvm.view(CheckView, check3).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check3.id);

		var expcHtml = '<input type="checkbox" checked id="check3">';
		evalOut(assert, checkEl, domvm.html(check3.vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 2 }, {checked: checkEl.checked}, {checked: true});

		// user interaction
		check3.vm.node.el.checked = false;

		// redraw with model.checked still true
		instr.start();
		check3.vm.redraw();
		var callCounts = instr.end();

		// the visual state should be reset back to the model state
		var expcHtml = '<input type="checkbox" checked id="check3">';
		evalOut(assert, checkEl, domvm.html(check3.vm.node), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});
})();

// TODO: assert triple equal outerHTML === domvm.html(vm.node) === hardcoded html
// does not test the .html() func or accurate tree creation

QUnit.module("Elems & id/class");

(function() {
	QUnit.test('Empty elem: ["div"]', function(assert) {
		var tpl = ["div"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('Text body: ["div", "moo"]', function(assert) {
		var tpl = ["div", "moo"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>moo</div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Void elem: ["input"]', function(assert) {
		var tpl = ["input"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<input>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('SVG elem: ["svg"]', function(assert) {
		var tpl = ["svg"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<svg></svg>';		// should include xlink & xmlns?
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElementNS: 1, insertBefore: 1 });
	});


	QUnit.test('["div#foo.class1.class2"]', function(assert) {
		var tpl = ["div#foo.class1.class2"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('["strong.class1.class2#foo"]', function(assert) {
		var tpl = ["strong.class1.class2#foo"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<strong id="foo" class="class1 class2"></strong>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('["#foo.class1.class2"]', function(assert) {
		var tpl = ["#foo.class1.class2"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('[".class1.class2#foo"]', function(assert) {
		var tpl = [".class1.class2#foo"];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	// classes should be additive, id should override
	QUnit.test('[".class1"] + {class: "class2 class3"}', function(assert) {
		var tpl = ["#abc.class1", {id: "qwerty", class: "class2 class3"}];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="qwerty" class="class1 class2 class3"></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, className: 1, id: 1 });
	});

	QUnit.test('Style Obj (camelCase)', function(assert) {
		var tpl = ["div", {style: { backgroundColor: "red" }}];

		instr.start();
		var vm = domvm.view(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div style="background-color: red;"></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});
})();

QUnit.module("Subview redraw() Branch Consistency");

(function() {
	function Parent() {
		this.kids = [];

		this.view = [ParentView, this];
	}

	function ParentView(vm, parent) {
		parent.vm = vm;
		return function() { return ["ul", parent.kids.map(function(kid) { return kid.view; })]; };
	}

	function Child(name) {
		this.name = name;

		this.view = [ChildView, this];
	}

	function ChildView(vm, child) {
		child.vm = vm;
		return function() { return ["li", child.name]; };
	}

	var mom = new Parent();
	mom.kids.push(new Child("Billy"));

	var vm, vm2;
//	var vm2 =	// how to get .html?

	QUnit.test('Proper initial HTML', function(assert) {
		var expcHtml = '<ul><li>Billy</li></ul>';

		instr.start();
		vm = domvm.view(mom.view).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('update child -> redraw child -> redraw parent', function(assert) {
		mom.kids[0].name = "Johnny";

		instr.start();
		mom.kids[0].vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Johnny</li></ul>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, {});
	});

	QUnit.test('update child -> redraw parent -> redraw child', function(assert) {
		mom.kids[0].name = "Chuck Norris";

		instr.start();
		mom.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Chuck Norris</li></ul>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.kids[0].vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, {});
	});

	// TODO: also with passed-in data
})();

QUnit.module("Various Others");

(function() {
	function SomeView(vm) {
		return function() {
			return ["div",
				["div",
					["strong",
						[SomeView2]
					]
				]
			];
		};
	}

	function SomeView2(vm) {
		return function() { return ["em", "yay!"]; };
	}

	var vm;

	QUnit.test('Init sub-view buried in plain nodes', function(assert) {
		var expcHtml = '<div><div><strong><em>yay!</em></strong></div></div>';

		instr.start();
		vm = domvm.view(SomeView).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 1 });
	});


	function FlattenView(vm) {
		return function() {
			return ["div", [
				["br"],
				"hello kitteh",
				[
					["em", "foo"],
					["em", "bar"],
					[SomeView2],
					"woohoo!",
					[
						[SomeView2],
						["i", "another thing"],
					]
				],
				"the end",
			]];
		};
	}

	QUnit.test('Flatten child sub-arrays', function(assert) {
		var expcHtml = '<div><br>hello kitteh<em>foo</em><em>bar</em><em>yay!</em>woohoo!<em>yay!</em><i>another thing</i>the end</div>';

		instr.start();
		vm = domvm.view(FlattenView).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 7, createTextNode: 3, insertBefore: 10, textContent: 5 });
	});

	function SomeView3() {
		return function() { return ["em", {style: {width: 30, zIndex: 5}}, "test"]; };
	}

	QUnit.test('"px" appended only to proper numeric style attrs', function(assert) {
		var expcHtml = '<em style="width: 30px; z-index: 5;">test</em>';

		instr.start();
		vm = domvm.view(SomeView3).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });
	});

	// TODO: how to test mounting to body without blowing away test?
	QUnit.test('Mount to existing element instead of append into', function(assert) {
		var em = document.createElement("em");

		var expcHtml = '<em style="width: 30px; z-index: 5;">test</em>';

		instr.start();
		vm = domvm.view(SomeView3).mount(em, true);
		var callCounts = instr.end();

		evalOut(assert, em, domvm.html(vm.node), expcHtml, callCounts, { textContent: 2 });		// uses +1 textContent to clear it first
	});

	QUnit.test('Raw HTML as body', function(assert) {
		function View5(vm) {
			return function() {
				return ["div", {_raw: true}, '<p class="foo">bar</p>&nbsp;baz'];
			};
		}

		var expcHtml = '<div><p class="foo">bar</p>&nbsp;baz</div>';

		instr.start();
		vm = domvm.view(View5).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, innerHTML: 1, insertBefore: 1 });
	});

	QUnit.test('Remove/clean child of sub-view', function(assert) {
		var data = ["a"];
		var data2 = ["b", "c"];

		function View6(vm) {
			return function() {
				return ["div",
					["p", data[0]],
					[View7, data2],
				];
			};
		}

		function View7(vm, data2) {
			return function() {
				return ["ul", data2.map(function(v) {
					return ["li", v];
				})];
			};
		}

		instr.start();
		vm = domvm.view(View6).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p>a</p><ul><li>b</li><li>c</li></ul></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 5, textContent: 3, insertBefore: 5 });

		data2.shift();

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p>a</p><ul><li>c</li></ul></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { removeChild: 1, nodeValue: 1 });
	});
})();


QUnit.module("Function node types & values");

(function() {
	function ViewAny(vm) {
		return function() { return tpl; };
	}

	function ViewAny2(vm) {
		return function() { return tpl2; };
	}

	var tpl = null;
	var tpl2 = null;
	var vm;

	QUnit.test('Root node is function that returns node', function(assert) {
		tpl = function() {
			return ["p", "some text"];
		};

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Body is getter function that returns text value', function(assert) {
		tpl = ["p", function() { return "some text" }];

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Body is function that returns child array', function(assert) {
		tpl = ["p", function() { return [["strong", "some text"]] }];

		var expcHtml = '<p><strong>some text</strong></p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('Child node is function that returns node', function(assert) {
		tpl = ["p", "something ", function() { return ["em", "foo"] }];

		var expcHtml = '<p>something <em>foo</em></p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

//		console.log(vm.node.el.outerHTML);

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 3, createTextNode: 1, textContent: 1 });
	});
/*
	TODO: this test fails but is visually correct, need to fix bug: implement adjacent text node merging
	QUnit.test('Child node is getter function that returns text value', function(assert) {
		tpl = ["p", "something ", function() { return "some text" }];		// cannot have child array that starts with text node

		var expcHtml = '<p>something some text</p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

//		console.log(vm.node.el.outerHTML);

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 3, createTextNode: 2 });
	});

/*
	QUnit.test('Body is function that returns single node', function(assert) {
		tpl = ["p", function() { return ["strong", "some text"] }];

		var expcHtml = '<p><strong>some text</strong></p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});
*/
	/*
	// Higher-order (functions that return complex nodes that need further recursive processing)
	// TODO?: higher order functions that return functions
	// Need to do a do/while loop to iterativly simplify nodes
	QUnit.test('Child node is function that returns sub-view', function(assert) {
		tpl = ["p", [function() { tpl2 = ["em", "some text"]; return [ViewAny2]; }]];

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Child node is function that returns sub-array', function(assert) {
		tpl = ["p", [["p", "moo"], function() { [["p", "cow"], ["em", "some text"]] }]];

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});
	*/

	QUnit.test('Attribute value is function/getter', function(assert) {
		tpl = ["input", {value: function() { return "moo"; }}];

		var expcHtml = '<input value="moo">';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 1 }, {value: vm.node.el.value}, {value: "moo"});
	});

	QUnit.test('Style object attr value is function/getter', function(assert) {
		tpl = ["input", {style: {width: function() { return "20px"; }}}];

		var expcHtml = '<input style="width: 20px;">';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	// style object value is function/getter
	// special props, id, className, _key, _ref?
})();


QUnit.module("emit() & synthetic events");

(function() {
	var data;

	function reset() {
		data = { abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" };
	}

	var vmA, vmB, vmC;

	function ViewA(vm) {
		vmA = vm;
		vm.on("abc", function() { data.abc += "a"; });
		vm.on("ab", function() { data.ab += "a"; });
		vm.on("ac", function() { data.ac += "a"; });
		vm.on("a", function() { data.a += "a"; });

		return function() { return ["#a", ["strong", [ViewB]]]; };
	}

	function ViewB(vm) {
		vmB = vm;
		vm.on("abc", function() { data.abc += "b"; });
		vm.on("ab", function() { data.ab += "b"; });
		vm.on("bc", function() { data.bc += "b"; });
		vm.on("b", function() { data.b += "b"; });

		return function() { return ["#b", ["em", [ViewC]]]; };
	}

	function ViewC(vm) {
		vmC = vm;
		vm.on("abc", function() { data.abc += "c"; });
		vm.on("bc", function() { data.bc += "c"; });
		vm.on("ac", function() { data.ac += "c"; });
		vm.on("c", function() { data.c += "c"; });

		return function() { return ["#c", "Hello"]; };
	}

	domvm.view(ViewA).mount()

	function mkTest(assert, vm) {
		return function test(ev, exp) {
			reset();
			vm.emit(ev);
			assert.propEqual(data, exp, ev);
		}
	}

	QUnit.test('vmC', function(assert) {
		var test = mkTest(assert, vmC);

		test("abc",		{ abc: "c", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "b", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "c", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "b", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "c", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "c" });
	});

	QUnit.test('vmB', function(assert) {
		var test = mkTest(assert, vmB);

		test("abc",		{ abc: "b", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "b", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "a", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "b", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "b", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
	});

	QUnit.test('vmA', function(assert) {
		var test = mkTest(assert, vmA);

		test("abc",		{ abc: "a", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "a", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "a", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
	});

	QUnit.test('Emit w/args', function(assert) {
		assert.expect(2);

		var vmY;

		function ViewY(vm) {
			vmY = vm;

			return function() {
				return ["div", "meh"];
			};
		}

		function ViewX(vm) {
			vm.on({
				testEv: function(arg1, arg2) {
					assert.equal(arg1, "arg1", "Arg1");
					assert.equal(arg2, "arg2", "Arg2");
				}
			});

			return function() {
				return ["div", [ViewY]];
			};
		}

		domvm.view(ViewX).mount();

		vmY.emit("testEv", "arg1", "arg2");
	});
})();

QUnit.module("redraw() ancestors");

(function() {
	var data = { a: 0, b: 0, c: 0 },
		vmA, vmB, vmC;

	function ViewA(vm) {
		vmA = vm;
		return function() {
			data.a++;
			return ["#a", ["strong", [ViewB]]];
		};
	}

	function ViewB(vm) {
		vmB = vm;
		return function() {
			data.b++;
			return ["#b", ["em", [ViewC]]];
		};
	}

	function ViewC(vm) {
		vmC = vm;
		return function() {
			data.c++;
			return ["#c", "Hello"];
		};
	}

	domvm.view(ViewA).mount();

	function mkTest(assert, vm) {
		return function test(targ, exp) {
			data = { a: 0, b: 0, c: 0 };
			vm.redraw(targ);			// , impCtx
			assert.propEqual(data, exp, targ);
		}
	}

	QUnit.test('vmC', function(assert) {
		var test = mkTest(assert, vmC);

		test(0, { a: 0, b: 0, c: 1 });
		test(1, { a: 0, b: 1, c: 1 });
		test(2, { a: 1, b: 1, c: 1 });
		test(1000, { a: 1, b: 1, c: 1 });
	});

	QUnit.test('vmB', function(assert) {
		var test = mkTest(assert, vmB);

		test(0, { a: 0, b: 1, c: 1 });
		test(1, { a: 1, b: 1, c: 1 });
		test(1000, { a: 1, b: 1, c: 1 });
	});

	QUnit.test('vmA', function(assert) {
		var test = mkTest(assert, vmA);

		test(0, { a: 1, b: 1, c: 1 });
		test(1, { a: 1, b: 1, c: 1 });
		test(1000, { a: 1, b: 1, c: 1 });
	});

	// todo: w/args
})();

QUnit.module("didRedraw() & refs");

(function() {
	QUnit.test('didRedraw() is called on self', function(assert) {
		assert.expect(2);

		var done = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Self didRedraw()");
					assert.ok(vm.refs.mySpan3.el === document.getElementById("zzz"), "Self ref");
				//	console.log(vm.refs);
					done();
				}
			});

			return function() { return ["span#zzz", {_ref: "mySpan3"}, "foo"]; };
		}

		var vm = domvm.view(MyView).mount(testyDiv);

		vm.redraw();
	});

	QUnit.test('didRedraw() is called on subviews when parent redraws', function(assert) {
		assert.expect(4);

		var done1 = assert.async();
		var done2 = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Parent didRedraw()");
					assert.ok(vm.refs.mySpan1.el === document.getElementById("xxx"), "Parent ref");
				//	console.log(vm.refs);
					done2();
				}
			});

			return function() { return ["span#xxx", {_ref: "mySpan1"}, [MyView2]]; };
		}

		function MyView2(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Child after()");
					assert.ok(vm.refs.mySpan2.el === document.getElementById("yyy"), "Child ref");
				//	console.log(vm.refs);
					done1();
				}
			});

			return function() { return ["span#yyy", {_ref: "mySpan2"}, "foo"]; };
		}

		var vm = domvm.view(MyView).mount(testyDiv);

		vm.redraw();

	//	setTimeout(done, 1);

		// todo: ensure refs get re-ref'd on redraw/reuse
	});
})();

QUnit.module("Unrenderable values");

(function() {
	function ViewAny(vm) {
		return function() { return tpl; };
	}

	var tpl = null,
		vm = null;

	QUnit.test('Values are properly coerced or ignored', function(assert) {
		tpl = ["div", 0, 25, "", NaN, 19, undefined, function() {return "blah";}, [], Infinity, null, {}, true, "yo", false];

		var expcHtml = '<div>025NaN19blahInfinity[object Object]trueyofalse</div>';

		instr.start();
		vm = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 2, createTextNode: 1 });
	});

	QUnit.test('Mutation of some nodes is consistent and does correct DOM ops', function(assert) {
		tpl = ["div", 0, ["span", "moo"], undefined, function() {return "blah";}, [["span", "bar"],["span","baz"]], Infinity, null, false];

		var expcHtml = '<div>0<span>moo</span>blah<span>bar</span><span>baz</span>Infinityfalse</div>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 3, createTextNode: 2, insertBefore: 5, nodeValue: 1, textContent: 3 });
	});

	QUnit.test('Empty text nodes should be squashed (isomorphism/innerHTML)', function(assert) {
		tpl = ["div", "", ["span", "moo"], "", ["span", "cow"], ""];

		var expcHtml = '<div><span>moo</span><span>cow</span></div>';

		instr.start();
		var vm2 = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, domvm.html(vm2.node), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });
	});

	QUnit.test('Null values in 0 idx should not be treated as tags', function(assert) {
		tpl = ["table.display-panel",
			["tbody", [
				null,
				["tr", null, [
					null,
					["td.A20", "X"],
				]],
			]]
		];

		var expcHtml = '<table class="display-panel"><tbody><tr><td class="A20">X</td></tr></tbody></table>';

		instr.start();
		var vm2 = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, domvm.html(vm2.node), expcHtml, callCounts, { createElement: 4, className: 2, insertBefore: 4, textContent: 1 });
	});

	QUnit.test('Allow explicit sub-array tagging (kids._expl)', function(assert) {
		var kids2 = ["c","d","e"];
		var kids = ["a","b",kids2];

		kids2._expl = kids._expl = true;

		tpl = ["div", kids];

		var expcHtml = '<div>abcde</div>';
		instr.start();
		var vm2 = domvm.view(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, domvm.html(vm2.node), expcHtml, callCounts, { createElement: 1, createTextNode: 1, insertBefore: 2 });
	});
})();

QUnit.module("Non-persistent model replacement");

(function() {
	function ViewA() {
		return function(vm, model) {
			return ["#viewA",
				model.foo,
				["br"],
				model.bar,
			];
		};
	}

	function ViewB() {
		return function(vm, model) {
			return ["#viewB", [ViewA, model, false]];
		};
	}

	// sub-views = [ViewB, null, null, data]?

	// createView,		modelView(), dataView()
	// createTpl,

	var dataA = {foo: "foo", bar: "bar"},
		dataB = {foo: "xxx", bar: "yyy"},
		vmA = null, vmB = null, vmC = null;

	QUnit.test('Initial view correctly rendered', function(assert) {
		var expcHtml = '<div id="viewA">foo<br>bar</div>';

		instr.start();
		vmA = domvm.view(ViewA, dataA, false).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { id: 1, createElement: 2, insertBefore: 4, createTextNode: 2 });
	});

	QUnit.test('Imperative replace via vm.update(newModel)', function(assert) {
		var expcHtml = '<div id="viewA">xxx<br>yyy</div>';

		instr.start();
		vmA.update(dataB);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.test('Declarative sub-view correctly rendered', function(assert) {
		var expcHtml = '<div id="viewB"><div id="viewA">foo<br>bar</div></div>';

		instr.start();
		vmB = domvm.view(ViewB, dataA, false).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmB.node.el, domvm.html(vmB.node), expcHtml, callCounts, { id: 2, createElement: 3, insertBefore: 5, createTextNode: 2 });
	});

	QUnit.test('Declarative replace', function(assert) {
		var expcHtml = '<div id="viewB"><div id="viewA">xxx<br>yyy</div></div>';

		instr.start();
		vmB.update(dataB);
		var callCounts = instr.end();

		evalOut(assert, vmB.node.el, domvm.html(vmB.node), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.test('Declarative sub-view render() returns false -> reuse', function(assert) {
		function ViewC() {
			return function(vm, model) {
				return ["strong", [ViewD, model.thing, false]];
			};
		}

		var subRedraws = 0;

		function ViewD() {
			var oldThing = null;

			return function(vm, thing) {
				if (thing === oldThing)
					return false;

				oldThing = thing;

				subRedraws++;

				return ["em", ["span", thing.text]];
			};
		}

		var model = {
			thing: { text: "foo" }
		};

		var expcHtml = '<strong><em><span>foo</span></em></strong>';

		instr.start();
		var vmC = domvm.view(ViewC, model, false).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 1 });

		instr.start();
		vmC.redraw();
		vmC.redraw();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { });

		assert.equal(subRedraws, 1, "Subview redraws");
	});

	QUnit.test('Ad-hoc model wrapper (keyed by model)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() { return ["#viewC", [ViewD, {foo: model, addl: myText}, model]]; };
		}

		function ViewD() {
			return function(vm, imp, key) {
				return ["#viewD",
					["span", imp.foo.text],
					["strong", imp.addl],
				];
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.view(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Ad-hoc model wrapper (explicitly unkeyed)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() { return ["#viewC", [ViewD, {foo: model, addl: myText}, false]]; };
		}

		function ViewD() {
			return function(vm, imp, key) {
				return ["#viewD",
					["span", imp.foo.text],
					["strong", imp.addl],
				];
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.view(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Ad-hoc model wrapper (non-keyed)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() { return ["#viewC", [ViewD, {foo: model, addl: myText}]]; };
		}

		function ViewD() {
			return function(vm, imp, key) {
				return ["#viewD",
					["span", imp.foo.text],
					["strong", imp.addl],
				];
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.view(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { id: 1, createElement: 3, insertBefore: 3, removeChild: 3, textContent: 2 });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, domvm.html(vmC.node), expcHtml, callCounts, { id: 1, createElement: 3, insertBefore: 3, removeChild: 3, textContent: 2 });
	});

/*
	// wraps model in own impCtx for sub-view, but opts out of persistence
	function ViewD(vm, model) {
		return () => ["#viewD", [ViewF, {foo: model, addl: "bar"}, false]];
	}

	function ViewF(vm, model) {
		return () => {
			return ["#viewD",
				model.foo,
				["br"],
				model.bar,
			];
		}
	}
*/

})();


QUnit.module("Model persistence keys, vm init, DOM reuse");

(function() {
	var dataA = {foo: "foo", bar: "bar"},
		dataB = {foo: "xxx", bar: "yyy"},
		vmA = null;

	function ViewA(vm) {
		vmA = vm;
/*
		vm.hook({
			willUnmount: function() {
				console.log("willUnmount");
			},
			didUnmount: function() {
				console.log("willUnmount");
			}
		});
*/
		return function(vm, model) {
			return ["div",
				["span", model.foo],
				["br"],
				["strong", model.bar],
			];
		};
	}

	QUnit.test('Persistent model correctly rendered', function(assert) {
		var expcHtml = '<div><span>foo</span><br><strong>bar</strong></div>';

		instr.start();
		vmA = domvm.view(ViewA, dataA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 2 });
	});
/*
	// should this force unmount the vm and re-create
	QUnit.test('Persistent model imperatively swapped out (should fail)', function(assert) {
		var expcHtml = '<div><span>xxx</span><br><strong>yyy</strong></div>';

		instr.start();
		vmA.update(dataB);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 2 });
	});
*/
	QUnit.test('Same model/handle, diff sib views', function(assert) {
		function ViewX(vm, model) {
			return function() {
				return ["div",
					[ViewY, model],
					[ViewZ, model],
				];
			};
		}

		function ViewY(vm, model) {
			return function() {
				return ["em", model.a];
			};
		}

		function ViewZ(vm, model) {
			return function() {
				return ["strong", model.b];
			};
		}

		var model = {
			a: "foo",
			b: "bar",
		};

		var expcHtml = '<div><em>foo</em><strong>bar</strong></div>';

		instr.start();
		var vm = domvm.view(ViewX, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { });
	});
})();


QUnit.module("Imperative VMs");

(function() {
	var modelA = {val: "A"},
		modelB = {val: "B"},
		modelC = {val: "C"},
		modelD = {val: "D"};

	var vmA, vmB, vmC, vmD, vmE, vmF;

	function ViewA(vm, model) {
		vmA = vm;
		vmB = domvm.view(ViewB, modelB);

		return function() {
			return ["div",
				model.val,
				vmB,
				[ViewC, modelC]
			];
		};
	}

	function ViewB(vm, model) {
		vmB = vm;

		return function() {
			return ["strong", model.val];
		};
	}

	function ViewC(vm, model) {
		vmC = vm;
		vmD = domvm.view(ViewD, modelD);

		return function() {
			return ["em", model.val, vmD];
		};
	}

	function ViewD(vm, model) {
		vmD = vm;

		return function() {
			return ["span", model.val];
		};
	}

	function ViewE(vm) {
		return function() {
			return ["span", "moo"];
		};
	}

	function ViewF(vm) {
		return function() {
			return ["div", vmE];
		};
	}

	QUnit.test('Initial view built correctly', function(assert) {
		var expcHtml = '<div>A<strong>B</strong><em>C<span>D</span></em></div>';

		instr.start();
		domvm.view(ViewA, modelA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { createElement: 4, createTextNode: 2, insertBefore: 6, textContent: 2 });
	});

	QUnit.test('A mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B</strong><em>C<span>D</span></em></div>';

		modelA.val = "A+";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('B mod, B redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		modelB.val = "B+";

		instr.start();
		vmB.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		instr.start();
		vmB.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, {});
	});

	QUnit.test('D mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		modelD.val = "D+";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('C redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, {});
	});

	QUnit.test('C mod, A redraw, C redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C+<span>D+</span></em></div>';

		modelC.val = "C+";

		instr.start();
		vmA.redraw();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A mod, C mod, A redraw', function(assert) {
		var expcHtml = '<div>A++<strong>B+</strong><em>C++<span>D+</span></em></div>';

		modelA.val = "A++";
		modelC.val = "C++";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.test('First-child VM should not be confused with props object', function(assert) {
		vmE = domvm.view(ViewE);

		var expcHtml = '<div><span>moo</span></div>';

		instr.start();
		vmF = domvm.view(ViewF).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmF.node.el, domvm.html(vmF.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('Avoid grafting unmounted sub-vm nodes', function(assert) {
		var a = null;

		function View() {
			return function() {
				return ["div", a];
			};
		}

		function A() {
			var i = 0;
			return function() {
				return ["div", "A" + i++];
			};
		}

		instr.start();
		var vm = domvm.view(View).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		a = domvm.view(A);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><div>A0</div></div>';
		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Sever `node.vm.node` binding when freeing unmounted sub-vms\' nodes into pool', function(assert) {
		function A() {
			return function() {
				return ["main", state == 1 ?
					vmB :
					["strong", "foo"]
				];
			};
		}

		function B() {
			return function() {
				return ["aside",
					["section", "bar"],
					vmC,
				];
			};
		}

		function C() {
			return function() {
				return ["h3", "baz"];
			};
		}

		var state = 1;

		var vmC = domvm.view(C, {});
		var vmB = domvm.view(B, {});
		var vmA = domvm.view(A, {});

		instr.start();
		vmA.mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<main><aside><section>bar</section><h3>baz</h3></aside></main>';
		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 2 });


		state = 2;
		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		var expcHtml = '<main><strong>foo</strong></main>';
		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1, removeChild: 3 });


		state = 1;
		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		var expcHtml = '<main><aside><section>bar</section><h3>baz</h3></aside></main>';
		evalOut(assert, vmA.node.el, domvm.html(vmA.node), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2, removeChild: 1 });
	});

	QUnit.test("Replace root node during sub-vm swapping", function(assert) {
		function App() {
			this.a = null;
			this.b = null;

			this.vm2 = domvm.view(View2, this);
			this.vm  = domvm.view(View, this);
		}

		function View(vm, app) {
			return function() {
				if (app.a == null)
					return ["h3", "Loading 1..."];
				if (app.b != null)
					return [".one", app.vm2];

				return [".one", "View 1"];
			};
		}

		function View2(vm, app) {
			return function() {
				if (app.a == null)
					return ["h3", "Loading 2..."]

				return [".two", "View 2"];
			};
		}

		var app = new App();

		instr.start();
		app.vm.mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<h3>Loading 1...</h3>';
		evalOut(assert, app.vm.node.el, domvm.html(app.vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		app.a = [1, 2];

		instr.start();
		app.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div class="one">View 1</div>';
		evalOut(assert, app.vm.node.el, domvm.html(app.vm.node), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });

		app.b = 0;

		instr.start();
		app.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div class="one"><div class="two">View 2</div></div>';
		evalOut(assert, app.vm.node.el, domvm.html(app.vm.node), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, textContent: 2 });
	});
})();

QUnit.module("Unjailed refs");

(function() {
	var footVm;

	var data = {
		a: "foo",
		b: "bar",
		c: "baz",
	};

	function updateData() {
		data.a = "moo";
		data.b = "cow";
		data.c = "now";
	}

	function AppView(vm, data) {
		vm.on("redrawMainAndFooter", function() {
			vm.refs.main.vm.redraw();
			vm.refs.footer.vm.redraw();
		});

		return function() {
			return ["div",
				data.a,
				[MainView, data],
				[FooterView, data, "^footer"],
			];
		};
	}

	function MainView(vm, data) {
		return function() { return ["strong", {_ref: "^main"}, data.b]; };
	}

	function FooterView(vm, data) {
		footVm = vm;

		return function() { return ["em", data.c]; };
	}

	QUnit.test('Modify', function(assert) {
		instr.start();
		var vm = domvm.view(AppView, data).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>bar</strong><em>baz</em></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 3, insertBefore: 4, textContent: 2, createTextNode: 1 });

		updateData();

		instr.start();
		vm.emit("redrawMainAndFooter");
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>cow</strong><em>now</em></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 2 });
	});
})();

QUnit.module("Namespaced refs");

(function() {
	function TestView() {
		return function() {
			return ["div", {_ref: "a.b.c"}];
		}
	}

	function TestView1() {
		return function() {
			return ["div", [TestView2]];
		}
	}

	var vm2;
	function TestView2(vm) {
		vm2 = vm;
		return function() {
			return ["div", {_ref: "^a.b.c"}];
		}
	}

	QUnit.test('Normal a.b.c', function(assert) {
		instr.start();
		var vm = domvm.view(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		assert.equal(vm.refs.a.b.c, vm.node);
	});

	QUnit.test('Unjailed ^a.b.c', function(assert) {
		instr.start();
		var vm = domvm.view(TestView1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div></div></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		assert.equal(vm.refs.a.b.c, vm2.node);
	});
})();

// also tests additive classes (doesnt test creating new class)

QUnit.module("Patch");

(function() {
	function getTpl(marg, klass, body) {
		return ["p.moo", {class: klass, style: {margin: marg}}, body];
	}

	function TestView() {
		return function() {
			return ["div", getTpl(10, "cow", "hey")];
		};
	}

	var vm;
	QUnit.test('Create', function(assert) {
		instr.start();
		vm = domvm.view(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo cow" style="margin: 10px;">hey</p></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, textContent: 1, className: 1, insertBefore: 2 });
	});

	QUnit.test('Full child tpl', function(assert) {
		instr.start();
		vm.patch(vm.node.el.firstChild._node, getTpl(20, "baz", "yo"));
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo baz" style="margin: 20px;">yo</p></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { className: 1, nodeValue: 1 });

//		console.log(vm.node.el.firstChild._node);
	});

	QUnit.test('Child class/style', function(assert) {
		instr.start();
		vm.patch(vm.node.el.firstChild._node, {class: "xxx", style: {margin: 5, color: "red"}});
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo xxx" style="margin: 5px; color: red;">yo</p></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { className: 1 });
	});
})();

QUnit.module("Lifecycle hooks");

(function() {
	var vm;

	QUnit.test('willUpdate (root/explicit)', function(assert) {
		function A(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return ["div", model.text];
			};
		}

		instr.start();
		vm = domvm.view(A, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>abc</div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		instr.start();
		vm.update({text: "def"});
		var callCounts = instr.end();

		var expcHtml = '<div>def</div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('willUpdate (sub-view/implicit)', function(assert) {
		function B(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return ["div",
					[C, model, false]
				];
			};
		}

		function C(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return ["strong", model.text];
			};
		}

		instr.start();
		vm = domvm.view(B, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>abc</strong></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { createElement: 2, textContent: 1, insertBefore: 2 });

		instr.start();
		vm.update({text: "def"});
		var callCounts = instr.end();

		var expcHtml = '<div><strong>def</strong></div>';

		evalOut(assert, vm.node.el, domvm.html(vm.node), expcHtml, callCounts, { nodeValue: 1 });
	});
})();


// QUnit.module("Keyed model & addlCtx replacement");