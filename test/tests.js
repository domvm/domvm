// domvm.createView.config({ debounce: false });

QUnit.config.reorder = false;

var	el = domvm.defineElement,
	tx = domvm.defineText,
	cm = domvm.defineComment,
	vw = domvm.defineView,
	iv = domvm.injectView,
	ie = domvm.injectElement;

var instr = new DOMInstr();

var testyDiv = document.getElementById("testy");

function evalOut(assert, viewEl, genrHtml, expcHtml, actuCounts, expcCounts, actuProps, expcProps) {
	var wrap = document.createElement("div");
	wrap.innerHTML = expcHtml;

//	console.log(outerHTML(wrap.firstChild).join("\n") + "\n-----\n" + outerHTML(viewEl).join("\n"));

	assert.equal(genrHtml, expcHtml, "vm.html(): " + genrHtml);
	assert.ok(viewEl.isEqualNode(wrap.firstChild), "DOM HTML: " + viewEl.outerHTML);
//	assert.equal(outerHTML(viewEl).join("\n"), outerHTML(wrap.firstChild).join("\n"), "DOM HTML: " + outerHTML(viewEl).join("\n"));
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
		tpl = el("input#foo.bar.baz", {type: "text", style: {fontFamily: "Arial", fontSize: 12}, disabled: true, custom: "abc", custom2: null, custom3: "", custom4: "foo", onclick: onclick});

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<input type="text" disabled="" custom="abc" custom3="" custom4="foo" id="foo" class="bar baz" style="font-family: Arial; font-size: 12px;">';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, className: 1, createElement: 1, insertBefore: 1, setAttribute: 4 });
	});

	// TODO: can 'id' or 'name' be allowed to change for recycling since they implicitly double as keys?
	// TODO: can any form elements be reused if non-matching type?
	QUnit.test("Update", function(assert) {
		var onclick = function() {};
		tpl = el("input#foo", {type: "text", style: {padding: 10}, disabled: false, custom: "xyz", custom2: "...", custom4: null});

		instr.start();
		vm.redraw(true);		// todo: create test container
		var callCounts = instr.end();
/*
		// a bit of a hack to get the outerHtml to match exactly fo the test
		// domvm sets className="" for perf rather than removeAttribute("class")
		if (vm.node.el.className === "")
			vm.node.el.removeAttribute("class");
*/
		var expcHtml = '<input type="text" custom="xyz" custom2="..." id="foo" style="padding: 10px;">';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeAttribute: 3, setAttribute: 2 });
	});
})();

QUnit.module("Unrenderable values");

(function() {
	function ViewAny(vm) {
		return function() { return tpl; };
	}

	var tpl = null,
		vm = null;

	QUnit.skip('Values are properly coerced or ignored', function(assert) {
		tpl = ["div", 0, 25, "", NaN, 19, undefined, function() {return "blah";}, [], Infinity, null, {}, true, "yo", false];

		var expcHtml = '<div>025NaN19blahInfinity[object Object]trueyofalse</div>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 2, createTextNode: 1 });
	});

	QUnit.skip('Mutation of some nodes is consistent and does correct DOM ops', function(assert) {
		tpl = ["div", 0, ["span", "moo"], undefined, function() {return "blah";}, [["span", "bar"],["span","baz"]], Infinity, null, false];

		var expcHtml = '<div>0<span>moo</span>blah<span>bar</span><span>baz</span>Infinityfalse</div>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 2, insertBefore: 5, nodeValue: 1, textContent: 3 });
	});

	// this test doesnt actually prove that anything gets squashed since innerHTML will not reflect this
	QUnit.test('Empty text nodes should be squashed, adjacent merged (isomorphism/innerHTML)', function(assert) {
		tpl = el("div", [
			tx(""),
			el("span", "moo"),
			tx(""),
			el("span", "cow"),
			tx(""),
			tx("abc"),
		]);

		var expcHtml = '<div><span>moo</span><span>cow</span>abc</div>';

		instr.start();
		var vm2 = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });
	});

	QUnit.skip('Null values in 0 idx should not be treated as tags', function(assert) {
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
		var vm2 = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { createElement: 4, className: 2, insertBefore: 4, textContent: 1 });
	});

	QUnit.skip('Allow explicit sub-array tagging (kids._expl)', function(assert) {
		var kids2 = ["c","d","e"];
		var kids = ["a","b",kids2];

		kids2._expl = kids._expl = true;

		tpl = ["div", kids];

		var expcHtml = '<div>abcde</div>';
		instr.start();
		var vm2 = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { createElement: 1, createTextNode: 1, insertBefore: 2 });
	});
})();

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
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 5 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 4 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2, nodeValue: 6 });
	});

	// update
	QUnit.test("Update first", function(assert) {
		list[0] = "z";

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li><li>zzz</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 10 });
	});

	// remove
	QUnit.test("Un-append", function(assert) {
		list.pop();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1, nodeValue: 9 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list0" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2, nodeValue: 4 });
	});
})();


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

QUnit.module("Other mods");

(function() {
	var tpl;

	function View(vm) {
		return function() { return tpl; };
	}

	QUnit.test('flatten arrays of arrays', function(assert) {
		var items = ["a","b","c"];

		tpl = el("div", [
			items.map(function(item) { return el("div", item); }),
			el("br"),
		]);
		var expcHtml = '<div><div>a</div><div>b</div><div>c</div><br></div>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 5, insertBefore: 5, textContent: 3 });
	});

	QUnit.test('(root) span -> a', function(assert) {
		tpl = el("span", "foo");
		var expcHtml = '<span>foo</span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		tpl = el("a", {href: "#"}, "bar");
		var expcHtml = '<a href="#">bar</a>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, setAttribute: 1, removeChild: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('(child) span -> a', function(assert) {
		tpl = el("div", [el("span", "foo")]);
		var expcHtml = '<div><span>foo</span></div>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		tpl = el("div", [el("a", {href: "#"}, "bar")]);
		var expcHtml = '<div><a href="#">bar</a></div>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createElement: 1, setAttribute: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('(body) [] -> text', function(assert) {
		tpl = el("span", [
			el("em","moo"),
			tx(" "),
			el("em","cow"),
		]);
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = el("span", "moo cow");
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { textContent: 1 });
	});

	QUnit.test('(body) text -> []', function(assert) {
		tpl = el("span", "moo cow");
		var expcHtml = '<span>moo cow</span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		tpl = el("span", [
			el("em","moo"),
			tx(" "),
			el("em","cow"),
		]);
		var expcHtml = '<span><em>moo</em> <em>cow</em></span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 2, createTextNode: 1, removeChild: 1, insertBefore: 3 });
	});

	QUnit.test('(body) textNode -> elem', function(assert) {
		tpl = el("span", [
			el("em", "foo"),
			tx(" bar "),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = el("span", [
			el("em", "foo"),
			el("br"),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createElement: 1, insertBefore: 1 });
	});

	QUnit.test('(body) textNode -> elem', function(assert) {
		tpl = el("span", [
			el("em", "foo"),
			tx(" bar "),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createTextNode: 1, insertBefore: 4, textContent: 2 });

		tpl = el("span", [
			el("em", "foo"),
			el("br"),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createElement: 1, insertBefore: 1 });
	});

	QUnit.test('(body) textNode -> elem (recycle)', function(assert) {
		tpl = el(".wrap", [
			el("div", [
				tx("David"),
				el("input"),
			]),
			el("div", [
				el("input[name=name]"),
				el("input[name=score]"),
			])
		]);
		var expcHtml = '<div class="wrap"><div>David<input></div><div><input name="name"><input name="score"></div></div>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 6, className: 1, createTextNode: 1, insertBefore: 7, setAttribute: 2});

		tpl = el(".wrap", [
			el("div", [
				el("input[name=name]"),
				el("input[name=score]"),
			])
		]);
		var expcHtml = '<div class="wrap"><div><input name="name"><input name="score"></div></div>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1 + 3, createElement: 1, insertBefore: 1, setAttribute: 2 });
	});

	QUnit.test('(body) elem -> textNode', function(assert) {
		tpl = el("span", [
			el("em", "foo"),
			el("br"),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em><br><strong>baz</strong></span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 4, textContent: 2, insertBefore: 4 });

		tpl = el("span", [
			el("em", "foo"),
			tx(" bar "),
			el("strong", "baz"),
		]);
		var expcHtml = '<span><em>foo</em> bar <strong>baz</strong></span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		// TODO-optim: can be replaceChild instead of removeChild/insertBefore
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, createTextNode: 1, insertBefore: 1 });
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
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 1, insertBefore: 2 });

		// swap model, should kill off node
		model = {text: "b"};

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div><p>b</p></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, removeChild: 1, textContent: 1, insertBefore: 1 });
	});
*/
})();

QUnit.module("Elems & id/class");

(function() {
	QUnit.test('Empty elem: ["div"]', function(assert) {
		var tpl = el("div");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('Comment: <!--test-->', function(assert) {
		var tpl = cm("test");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<!--test-->';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createComment: 1, insertBefore: 1 });
	});

	QUnit.test('Text body: ["div", "moo"]', function(assert) {
		var tpl = el("div", "moo");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>moo</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Void elem: ["input"]', function(assert) {
		var tpl = el("input");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<input>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.skip('SVG elem: ["svg"]', function(assert) {
		var tpl = el("svg");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<svg></svg>';		// should include xlink & xmlns?
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElementNS: 1, insertBefore: 1 });
	});

	QUnit.test('["div#foo.class1.class2"]', function(assert) {
		var tpl = el("div#foo.class1.class2");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('["strong.class1.class2#foo"]', function(assert) {
		var tpl = el("strong.class1.class2#foo");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<strong id="foo" class="class1 class2"></strong>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('["#foo.class1.class2"]', function(assert) {
		var tpl = el("#foo.class1.class2");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	QUnit.test('[".class1.class2#foo"]', function(assert) {
		var tpl = el(".class1.class2#foo");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="class1 class2"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, className: 1 });
	});

	// classes should be additive, id should override
	QUnit.test('[".class1"] + {class: "class2 class3"}', function(assert) {
		var tpl = el("#abc.class1", {id: "qwerty", class: "class2 class3"});

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="qwerty" class="class1 class2 class3"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, className: 1, id: 1 });
	});

	QUnit.test('Style Obj (camelCase)', function(assert) {
		var tpl = el("div", {style: { backgroundColor: "red" }});

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div style="background-color: red;"></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	QUnit.test('Attr shorthands', function(assert) {
		var tpl = el("input[type=number][readonly]");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<input type="number" readonly="">';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 2 });

		var tpl = el("button[type=submit][disabled]", "Submit");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<button type="submit" disabled="">Submit</button>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 2, textContent: 1 });
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
		return function() {
			return el("input#" + check.id, {type: "checkbox", checked: check.checked});
		};
	};

	var check1 = new Check("check1", false);
	var check2 = new Check("check2", true);
	var check3 = new Check("check3", true);

	QUnit.test("Bool attr init false", function(assert) {
		instr.start();
		domvm.createView(CheckView, check1).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, check1.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1, checked: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Bool attr toggle true", function(assert) {
		check1.checked = true;

		instr.start();
		check1.vm.redraw(true);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, check1.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr init true", function(assert) {
		instr.start();
		domvm.createView(CheckView, check2).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, check2.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1, checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr toggle false", function(assert) {
		check2.checked = false;

		instr.start();
		check2.vm.redraw(true);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, check2.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Dynamic props, always sync vtree -> DOM prop", function(assert) {
		instr.start();
		domvm.createView(CheckView, check3).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check3.id);

		var expcHtml = '<input type="checkbox" id="check3">';
		evalOut(assert, checkEl, check3.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1, checked: 1 }, {checked: checkEl.checked}, {checked: true});

		// user interaction
		check3.vm.node.el.checked = false;

		// redraw with model.checked still true
		instr.start();
		check3.vm.redraw(true);
		var callCounts = instr.end();

		// the visual state should be reset back to the model state
		var expcHtml = '<input type="checkbox" id="check3">';
		evalOut(assert, checkEl, check3.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});
})();

// TODO: assert triple equal outerHTML === vm.html() === hardcoded html
// does not test the .html() func or accurate tree creation


QUnit.module("Subview List w/keys");

(function() {
	var list = ["a","b","c"];

	function ListViewKeyed(vm, list) {
		return function() {
			return el("ul#list2.test-output", list.map(function(item) {
				return vw(ListViewItem, item, item);
			}));
		};
	}

	function ListViewItem(vm, item, key) {
		return function() {
			return el("li", item);		// {_key: item}
		};
	}

	var vm, listEl;

	QUnit.test("Create", function(assert) {
		instr.start();
		vm = domvm.createView(ListViewKeyed, list).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		listEl = document.getElementById("list2");

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { id: 1, createElement: 4, insertBefore: 4, className: 1, textContent: 3 });
	});

	// noop
	QUnit.test("Redraw", function(assert) {
		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, {});
	});

	// add
	QUnit.test("Append", function(assert) {
		list.push("baz","cow");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Prepend", function(assert) {
		list.unshift("foo", "bar");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert", function(assert) {
		list.splice(3, 0, "moo", "xxx");

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>foo</li><li>bar</li><li>a</li><li>moo</li><li>xxx</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 2 });
	});

	QUnit.test("Insert disjoint", function(assert) {
		list.splice(3, 0, "fff");
		list.splice(6, 0, "zzz");

		instr.start();
		vm.redraw(true);
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
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>cow</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update last", function(assert) {
		list[list.length-1] = 10;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>fff</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test("Update middle", function(assert) {
		list[3] = 666;

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul id="list2" class="test-output"><li>z</li><li>bar</li><li>a</li><li>666</li><li>moo</li><li>xxx</li><li>zzz</li><li>b</li><li>c</li><li>baz</li><li>10</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});
*/
	QUnit.test("Update many (sort)", function(assert) {
		list.sort();

		instr.start();
		vm.redraw(true);
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
		vm.redraw(true);
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>10</li><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-prepend", function(assert) {
		list.shift();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>bar</li><li>baz</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>c</li><li>cow</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 1 });
	});

	QUnit.test("Un-insert", function(assert) {
		list.splice(3,2);

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

//		var expcHtml = '<ul id="list2" class="test-output"><li>666</li><li>a</li><li>b</li><li>c</li><li>moo</li><li>xxx</li><li>z</li></ul>';
		var expcHtml = '<ul id=\"list2\" class=\"test-output\"><li>b</li><li>bar</li><li>baz</li><li>fff</li><li>foo</li><li>moo</li><li>xxx</li></ul>';
		evalOut(assert, listEl, vm.html(), expcHtml, callCounts, { removeChild: 2 });
	});
})();

QUnit.module("Subview redraw(true) Branch Consistency");

(function() {
	function Parent() {
		this.kids = [];

		this.view = vw(ParentView, this);
	}

	function ParentView(vm, parent) {
		parent.vm = vm;

		return function() {
			return el("ul", parent.kids.map(function(kid) {
				return kid.view;
			}));
		};
	}

	function Child(name) {
		this.name = name;

		this.view = vw(ChildView, this);
	}

	function ChildView(vm, child) {
		child.vm = vm;

		return function() {
			return el("li", child.name);
		};
	}

	var mom = new Parent();
	mom.kids.push(new Child("Billy"));

	var vm, vm2;
//	var vm2 =	// how to get .html?

	QUnit.test('Proper initial HTML', function(assert) {
		var expcHtml = '<ul><li>Billy</li></ul>';

		instr.start();
		vm = domvm.createView(mom.view).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('update child -> redraw child -> redraw parent', function(assert) {
		mom.kids[0].name = "Johnny";

		instr.start();
		mom.kids[0].vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Johnny</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	QUnit.test('update child -> redraw parent -> redraw child', function(assert) {
		mom.kids[0].name = "Chuck Norris";

		instr.start();
		mom.vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Chuck Norris</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.kids[0].vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	// TODO: also with passed-in data
})();

QUnit.module("Various Others");

(function() {
	function SomeView(vm) {
		return function() {
			return el("div", [
				el("div", [
					el("strong", [
						vw(SomeView2)
					])
				])
			]);
		};
	}

	function SomeView2(vm) {
		return function() {
			return el("em", "yay!");
		};
	}

	var vm;

	QUnit.test('Init sub-view buried in plain nodes', function(assert) {
		var expcHtml = '<div><div><strong><em>yay!</em></strong></div></div>';

		instr.start();
		vm = domvm.createView(SomeView).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 1 });
	});


	function FlattenView(vm) {
		return function() {
			return el("div", [
				el("br"),
				tx("hello kitteh"),
				[
					el("em", "foo"),
					el("em", "bar"),
					vw(SomeView2),
					tx("woohoo!"),
					[
						vw(SomeView2),
						el("i", "another thing"),
					]
				],
				tx("the end"),
			]);
		};
	}

	QUnit.test('Flatten child sub-arrays', function(assert) {
		var expcHtml = '<div><br>hello kitteh<em>foo</em><em>bar</em><em>yay!</em>woohoo!<em>yay!</em><i>another thing</i>the end</div>';

		instr.start();
		vm = domvm.createView(FlattenView).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 7, createTextNode: 3, insertBefore: 10, textContent: 5 });
	});

	function SomeView3() {
		return function() {
			return el("em", {style: {width: 30, zIndex: 5}}, "test");
		};
	}

	QUnit.test('"px" appended only to proper numeric style attrs', function(assert) {
		var expcHtml = '<em style="width: 30px; z-index: 5;">test</em>';

		instr.start();
		vm = domvm.createView(SomeView3).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });
	});

	// TODO: how to test mounting to body without blowing away test?
	QUnit.test('Mount to existing element instead of append into', function(assert) {
		var em = document.createElement("em");
		em.textContent = "abc";

		var expcHtml = '<em style="width: 30px; z-index: 5;">test</em>';

		instr.start();
		vm = domvm.createView(SomeView3).mount(em, true);
		var callCounts = instr.end();

		evalOut(assert, em, vm.html(), expcHtml, callCounts, { textContent: 1, removeChild: 1 });
	});

	QUnit.test('Raw HTML as body', function(assert) {
		function View5(vm) {
			return function() {
				return el("div", {_raw: true}, '<p class="foo">bar</p>&nbsp;baz');		// .html()
			};
		}

		var expcHtml = '<div><p class="foo">bar</p>&nbsp;baz</div>';

		instr.start();
		vm = domvm.createView(View5).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, innerHTML: 1, insertBefore: 1 });
	});

	QUnit.test('Existing DOM element as child', function(assert) {
		var el2 = document.createElement("strong");
		el2.textContent = "cow";

		var body = [
			ie(el2),
			tx("abc"),
		];

		function View6(vm) {
			return function() {
				return el("div", body);
			};
		}

		var expcHtml = '<div><strong>cow</strong>abc</div>';

		instr.start();
		vm = domvm.createView(View6).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, createTextNode: 1, insertBefore: 3 });


		// TODO: ensure injected elems get matched exactly during findDonor

		var body = [
			tx("abc"),
			ie(el2),
		];

		var expcHtml = '<div>abc<strong>cow</strong></div>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	QUnit.test('Remove/clean child of sub-view', function(assert) {
		var data = ["a"];
		var data2 = ["b", "c"];

		function View6(vm) {
			return function() {
				return el("div", [
					el("p", data[0]),
					vw(View7, data2),
				]);
			};
		}

		function View7(vm, data2) {
			return function() {
				return el("ul", data2.map(function(v) {
					return el("li", v);
				}));
			};
		}

		instr.start();
		vm = domvm.createView(View6).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p>a</p><ul><li>b</li><li>c</li></ul></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 5, textContent: 3, insertBefore: 5 });

		data2.shift();

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div><p>a</p><ul><li>c</li></ul></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, nodeValue: 1 });
	});

	QUnit.test('vm.root()', function(assert) {
		var vmA, vmB, vmC;

		function ViewA(vm) {
			vmA = vm;
			return function() {
				return el("#a", [
					vw(ViewB)
				]);
			}
		}

		function ViewB(vm) {
			vmB = vm;
			return function() {
				return el("#b", [
					vw(ViewC)
				]);
			};
		}

		function ViewC(vm) {
			vmC = vm;
			return function() {
				return el("#c", "Hi!");
			};
		}

		domvm.createView(ViewA).mount(testyDiv);

		assert.equal(vmC.root(), vmA);
		assert.equal(vmB.root(), vmA);
		assert.equal(vmA.root(), vmA);
	});
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

		return function() {
			return el("#a", [
				el("strong", [
					vw(ViewB)
				])
			]);
		};
	}

	function ViewB(vm) {
		vmB = vm;
		vm.on("abc", function() { data.abc += "b"; });
		vm.on("ab", function() { data.ab += "b"; });
		vm.on("bc", function() { data.bc += "b"; });
		vm.on("b", function() { data.b += "b"; });

		return function() {
			return el("#b", [
				el("em", [
					vw(ViewC)
				])
			]);
		};
	}

	function ViewC(vm) {
		vmC = vm;
		vm.on("abc", function() { data.abc += "c"; });
		vm.on("bc", function() { data.bc += "c"; });
		vm.on("ac", function() { data.ac += "c"; });
		vm.on("c", function() { data.c += "c"; });

		return function() {
			return el("#c", "Hello");
		};
	}

	function mkTest(assert, vm) {
		return function test(ev, exp) {
			reset();
			vm.emit(ev);
			assert.propEqual(data, exp, ev);
		}
	}

	QUnit.test('Create', function(assert) {
		instr.start();
		domvm.createView(ViewA).mount();
		var callCounts = instr.end();

		var expcHtml = '<div id="a"><strong><div id="b"><em><div id="c">Hello</div></em></div></strong></div>';

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 5, insertBefore: 4, textContent: 1, id: 3});
	});

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
				return el("div", "meh");
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
				return el("div", [
					vw(ViewY)
				]);
			};
		}

		domvm.createView(ViewX).mount();

		vmY.emit("testEv", "arg1", "arg2");
	});
})();

/*
QUnit.module("redraw(true) ancestors");

(function() {
	var data = { a: 0, b: 0, c: 0 },
		vmA, vmB, vmC;

	function ViewA(vm) {
		vmA = vm;
		return function() {
			data.a++;
			return el("#a", [
				el("strong", [
					vw(ViewB)
				])
			]);
		};
	}

	function ViewB(vm) {
		vmB = vm;
		return function() {
			data.b++;
			return el("#b", [
				el("em", [
					vw(ViewC)
				])
			]);
		};
	}

	function ViewC(vm) {
		vmC = vm;
		return function() {
			data.c++;
			return el("#c", "Hello");
		};
	}

	function mkTest(assert, vm) {
		return function test(level, exp) {
			data = { a: 0, b: 0, c: 0 };
			vm.parent().redraw(true);
			assert.propEqual(data, exp, level);
		}
	}

	QUnit.test('Create', function(assert) {
		var expcHtml = '<div id="a"><strong><div id="b"><em><div id="c">Hello</div></em></div></strong></div>';

		instr.start();
		domvm.createView(ViewA).mount();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 5, insertBefore: 4, textContent: 1, id: 3});
	});

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
*/

QUnit.module("didredraw(true) & refs");

(function() {
	QUnit.test('didredraw(true) is called on self', function(assert) {
		assert.expect(2);

		var done = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Self didredraw(true)");
					assert.ok(vm.refs.mySpan3.el === document.getElementById("zzz"), "Self ref");
				//	console.log(vm.refs);
					done();
				}
			});

			return function() {
				return el("span#zzz", {_ref: "mySpan3"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw(true);
	});

	QUnit.test('didredraw(true) is called on subviews when parent redraws', function(assert) {
		assert.expect(4);

		var done1 = assert.async();
		var done2 = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Parent didredraw(true)");
					assert.ok(vm.refs.mySpan1.el === document.getElementById("xxx"), "Parent ref");
				//	console.log(vm.refs);
					done2();
				}
			});

			return function() {
				return el("span#xxx", {_ref: "mySpan1"}, [
					vw(MyView2)
				]);
			};
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

			return function() {
				return el("span#yyy", {_ref: "mySpan2"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw(true);

	//	setTimeout(done, 1);

		// todo: ensure refs get re-ref'd on redraw/reuse
	});
})();

QUnit.module("Non-persistent model replacement");

(function() {
	function ViewA() {
		return function(vm, model) {
			return el("#viewA", [
				tx(model.foo),
				el("br"),
				tx(model.bar),
			]);
		};
	}

	function ViewB() {
		return function(vm, model) {
			return el("#viewB", [
				vw(ViewA, model, false)
			]);
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
		vmA = domvm.createView(ViewA, dataA, false).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { id: 1, createElement: 2, insertBefore: 4, createTextNode: 2 });
	});

	QUnit.test('Imperative replace via vm.update(newModel)', function(assert) {
		var expcHtml = '<div id="viewA">xxx<br>yyy</div>';

		instr.start();
		vmA.update(dataB, true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.test('Declarative sub-view correctly rendered', function(assert) {
		var expcHtml = '<div id="viewB"><div id="viewA">foo<br>bar</div></div>';

		instr.start();
		vmB = domvm.createView(ViewB, dataA, false).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmB.node.el, vmB.html(), expcHtml, callCounts, { id: 2, createElement: 3, insertBefore: 5, createTextNode: 2 });
	});

	QUnit.test('Declarative replace', function(assert) {
		var expcHtml = '<div id="viewB"><div id="viewA">xxx<br>yyy</div></div>';

		instr.start();
		vmB.update(dataB, true);
		var callCounts = instr.end();

		evalOut(assert, vmB.node.el, vmB.html(), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.test('vm.diff(getArgs) should reuse view if [arg1, arg2...] is same between redraws', function(assert) {
		var redraws = 0;

		function ViewA(vm, model) {
			vm.diff({
				vals: function(vm, model) {
					return [model.class, model.text];
				}
			});

			return function() {
				redraws++;
				return el("strong", {class: model.class}, model.text);
			};
		}

		var model = {
			class: "classy",
			text: "texture",
		};

		var expcHtml = '<strong class="classy">texture</strong>';

		instr.start();
		var vmA = domvm.createView(ViewA, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1, className: 1 });

		instr.start();
		vmA.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { });

		assert.equal(redraws, 1, "Subview redraws");

		model.text = "fabric";

		var expcHtml = '<strong class="classy">fabric</strong>';

		instr.start();
		vmA.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });

		assert.equal(redraws, 2, "Subview redraws");
	});

	QUnit.test('Ad-hoc model wrapper (keyed by model)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() {
				return el("#viewC", [
					vw(ViewD, {foo: model, addl: myText}, model)
				]);
			};
		}

		function ViewD() {
			return function(vm, imp, key) {
				return el("#viewD", [
					el("span", imp.foo.text),
					el("strong", imp.addl),
				]);
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.createView(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Ad-hoc model wrapper (explicitly unkeyed)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() {
				return el("#viewC", [
					vw(ViewD, {foo: model, addl: myText}, false)
				]);
			};
		}

		function ViewD() {
			return function(vm, imp, key) {
				return el("#viewD", [
					el("span", imp.foo.text),
					el("strong", imp.addl),
				]);
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.createView(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Ad-hoc model wrapper (non-keyed)', function(assert) {
		var vmC = null, vmD = null;

		// wraps model in own impCtx for sub-view, but specs model as persitent
		function ViewC(vm, model) {
			return function() {
				return el("#viewC", [
					vw(ViewD, {foo: model, addl: myText})
				]);
			};
		}

		function ViewD() {
			return function(vm, imp, key) {
				return el("#viewD", [
					el("span", imp.foo.text),
					el("strong", imp.addl),
				]);
			};
		}

		var model = {text: "bleh"};
		var myText = "bar";

		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>bar</strong></div></div>';

		instr.start();
		vmC = domvm.createView(ViewC, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { id: 2, createElement: 4, insertBefore: 4, textContent: 2 });

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { id: 1, createElement: 3, insertBefore: 3, removeChild: 3, textContent: 2 });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { id: 1, createElement: 3, insertBefore: 3, removeChild: 3, textContent: 2 });
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
			return el("div", [
				el("span", model.foo),
				el("br"),
				el("strong", model.bar),
			]);
		};
	}

	QUnit.test('Persistent model correctly rendered', function(assert) {
		var expcHtml = '<div><span>foo</span><br><strong>bar</strong></div>';

		instr.start();
		vmA = domvm.createView(ViewA, dataA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 2 });
	});
/*
	// should this force unmount the vm and re-create
	QUnit.test('Persistent model imperatively swapped out (should fail)', function(assert) {
		var expcHtml = '<div><span>xxx</span><br><strong>yyy</strong></div>';

		instr.start();
		vmA.update(dataB, true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 2 });
	});
*/
	QUnit.test('Same model/handle, diff sib views', function(assert) {
		function ViewX(vm, model) {
			return function() {
				return el("div", [
					vw(ViewY, model),
					vw(ViewZ, model),
				]);
			};
		}

		function ViewY(vm, model) {
			return function() {
				return el("em", model.a);
			};
		}

		function ViewZ(vm, model) {
			return function() {
				return el("strong", model.b);
			};
		}

		var model = {
			a: "foo",
			b: "bar",
		};

		var expcHtml = '<div><em>foo</em><strong>bar</strong></div>';

		instr.start();
		var vm = domvm.createView(ViewX, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });
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
		vmB = domvm.createView(ViewB, modelB);

		return function() {
			return el("div", [
				tx(model.val),
				iv(vmB),
				vw(ViewC, modelC),
			]);
		};
	}

	function ViewB(vm, model) {
		vmB = vm;

		return function() {
			return el("strong", model.val);
		};
	}

	function ViewC(vm, model) {
		vmC = vm;
		vmD = domvm.createView(ViewD, modelD);

		return function() {
			return el("em", [
				tx(model.val),
				iv(vmD),
			]);
		};
	}

	function ViewD(vm, model) {
		vmD = vm;

		return function() {
			return el("span", model.val);
		};
	}

	function ViewE(vm) {
		return function() {
			return el("span", "moo");
		};
	}

	function ViewF(vm) {
		return function() {
			return el("div", vmE);
		};
	}

	QUnit.test('Initial view built correctly', function(assert) {
		var expcHtml = '<div>A<strong>B</strong><em>C<span>D</span></em></div>';

		instr.start();
		domvm.createView(ViewA, modelA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 4, createTextNode: 2, insertBefore: 6, textContent: 2 });
	});

	QUnit.test('A mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B</strong><em>C<span>D</span></em></div>';

		modelA.val = "A+";

		instr.start();
		vmA.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('B mod, B redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		modelB.val = "B+";

		instr.start();
		vmB.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		instr.start();
		vmB.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, {});
	});

	QUnit.test('D mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		modelD.val = "D+";

		instr.start();
		vmA.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('C redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		instr.start();
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, {});
	});

	QUnit.test('C mod, A redraw, C redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C+<span>D+</span></em></div>';

		modelC.val = "C+";

		instr.start();
		vmA.redraw(true);
		vmC.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A mod, C mod, A redraw', function(assert) {
		var expcHtml = '<div>A++<strong>B+</strong><em>C++<span>D+</span></em></div>';

		modelA.val = "A++";
		modelC.val = "C++";

		instr.start();
		vmA.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 2 });
	});

	QUnit.skip('First-child VM should not be confused with props object', function(assert) {
		vmE = domvm.createView(ViewE);

		var expcHtml = '<div><span>moo</span></div>';

		instr.start();
		vmF = domvm.createView(ViewF).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('Avoid grafting unmounted sub-vm nodes', function(assert) {
		var a = '';

		function View() {
			return function() {
				return el("div", typeof a == "string" ? a : [iv(a)]);
			};
		}

		function A() {
			var i = 0;
			return function() {
				return el("div", "A" + i++);
			};
		}

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		a = domvm.createView(A);

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div><div>A0</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test("Replace root node during sub-vm swapping", function(assert) {
		function App() {
			this.a = null;
			this.b = null;

			this.vm2 = domvm.createView(View2, this);
			this.vm  = domvm.createView(View, this);
		}

		function View(vm, app) {
			return function() {
				if (app.a == null)
					return el("h3", "Loading 1...");
				if (app.b != null)
					return el(".one", [
						iv(app.vm2)
					]);

				return el(".one", "View 1");
			};
		}

		function View2(vm, app) {
			return function() {
				if (app.a == null)
					return el("h3", "Loading 2...");

				return el(".two", "View 2");
			};
		}

		var app = new App();

		instr.start();
		app.vm.mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<h3>Loading 1...</h3>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		app.a = [1, 2];

		instr.start();
		app.vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div class="one">View 1</div>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });

		app.b = 0;

		instr.start();
		app.vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div class="one"><div class="two">View 2</div></div>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
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
			vm.refs.main.vm().redraw(true);
			vm.refs.footer.vm().redraw(true);
		});

		return function() {
			return el("div", [
				tx(data.a),
				vw(MainView, data),
				vw(FooterView, data, "^footer"),
			]);
		};
	}

	function MainView(vm, data) {
		return function() {
			return el("strong", {_ref: "^main"}, data.b);
		};
	}

	function FooterView(vm, data) {
		footVm = vm;

		return function() {
			return el("em", data.c);
		};
	}

	QUnit.test('Modify', function(assert) {
		instr.start();
		var vm = domvm.createView(AppView, data).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>bar</strong><em>baz</em></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 4, textContent: 2, createTextNode: 1 });

		updateData();

		instr.start();
		vm.emit("redrawMainAndFooter");
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>cow</strong><em>now</em></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 2 });
	});
})();

QUnit.module("Namespaced refs");

(function() {
	function TestView() {
		return function() {
			return el("div", {_ref: "a.b.c"});
		}
	}

	function TestView1() {
		return function() {
			return el("div", [
				vw(TestView2)
			]);
		}
	}

	var vm2;
	function TestView2(vm) {
		vm2 = vm;
		return function() {
			return el("div", {_ref: "^a.b.c"});
		}
	}

	QUnit.test('Normal a.b.c', function(assert) {
		instr.start();
		var vm = domvm.createView(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		assert.equal(vm.refs.a.b.c, vm.node);
	});

	QUnit.test('Unjailed ^a.b.c', function(assert) {
		instr.start();
		var vm = domvm.createView(TestView1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div></div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		assert.equal(vm.refs.a.b.c, vm2.node);
	});
})();

// also tests additive classes (doesnt test creating new class)

QUnit.module("Patch");

(function() {
	function getTpl(marg, klass, body) {
		return el("p.moo", {class: klass, style: {margin: marg}}, body);
	}

	function TestView() {
		return function() {
			return el("div", [
				getTpl(10, "cow", "hey")
			]);
		};
	}

	var vm;
	QUnit.test('Create', function(assert) {
		instr.start();
		vm = domvm.createView(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo cow" style="margin: 10px;">hey</p></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 1, className: 1, insertBefore: 2 });
	});

	QUnit.test('Child class/style', function(assert) {
		instr.start();
		vm.node.el.firstChild._node.patch({class: "xxx", style: {margin: 5, color: "red"}});
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo xxx" style="margin: 5px; color: red;">hey</p></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { className: 1 });
	});

	QUnit.test('Full child tpl', function(assert) {
		instr.start();
		vm.node.el.firstChild._node.patch(getTpl(20, "baz", "yo"));
		var callCounts = instr.end();

		var expcHtml = '<div><p class="moo baz" style="margin: 20px;">yo</p></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { className: 1, nodeValue: 1 });

//		console.log(vm.node.el.firstChild._node);
	});
})();

QUnit.module("Lifecycle hooks");

// willRecycle, willReinsert

(function() {
	var vm;

	QUnit.test('will/did: mount/insert/remove/unmount (self)', function(assert) {
		var i = 0;

		var willMount = -1;
		var willInsert = -1;
		var didInsert = -1;
		var didMount = -1;

		var willUnmount = -1;
		var willRemove = -1;
		var didRemove = -1;
		var didUnmount = -1;

		function A(vm) {
			vm.hook({
				willMount: function(vm) {
					willMount = i++;
				},
				didMount: function(vm) {
					didMount = i++;
				},
				willUnmount: function(vm) {
					willUnmount = i++;
				},
				didUnmount: function(vm) {
					didUnmount = i++;
				}
			});

			return function() {
				var hooks = {
					willInsert: function(node) {
						willInsert = i++;
					},
					didInsert: function(node) {
						didInsert = i++;
					},
					willRemove: function(node) {
						willRemove = i++;
					},
					didRemove: function(node) {
						didRemove = i++;
					},
				};

				return el("div", {_hooks: hooks}, "abc");
			};
		}

		instr.start();
		vm = domvm.createView(A).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>abc</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		vm.unmount();

		assert.equal(willMount,		0, "willMount");
		assert.equal(willInsert,	1, "willInsert");
		assert.equal(didInsert,		2, "didInsert");
		assert.equal(didMount,		3, "didMount");
		assert.equal(willUnmount,	4, "willUnmount");
		assert.equal(willRemove,	5, "willRemove");
		assert.equal(didRemove,		6, "didRemove");
		assert.equal(didUnmount,	7, "didUnmount");
	});

	QUnit.test('willUpdate (root/explicit)', function(assert) {
		function A(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("div", model.text);
			};
		}

		instr.start();
		vm = domvm.createView(A, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>abc</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		instr.start();
		vm.update({text: "def"}, true);
		var callCounts = instr.end();

		var expcHtml = '<div>def</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('willUpdate (sub-view/implicit)', function(assert) {
		function B(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("div", [
					vw(C, model, false)
				]);
			};
		}

		function C(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("strong", model.text);
			};
		}

		instr.start();
		vm = domvm.createView(B, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>abc</strong></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 1, insertBefore: 2 });

		instr.start();
		vm.update({text: "def"}, true);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>def</strong></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
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

	QUnit.skip('Root node is function that returns node', function(assert) {
		tpl = function() {
			return ["p", "some text"];
		};

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.skip('Body is getter function that returns text value', function(assert) {
		tpl = ["p", function() { return "some text" }];

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.skip('Body is function that returns child array', function(assert) {
		tpl = ["p", function() { return [["strong", "some text"]] }];

		var expcHtml = '<p><strong>some text</strong></p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.skip('Child node is function that returns node', function(assert) {
		tpl = ["p", "something ", function() { return ["em", "foo"] }];

		var expcHtml = '<p>something <em>foo</em></p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

//		console.log(vm.node.el.outerHTML);

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 3, createTextNode: 1, textContent: 1 });
	});
/*
	TODO: this test fails but is visually correct, need to fix bug: implement adjacent text node merging
	QUnit.test('Child node is getter function that returns text value', function(assert) {
		tpl = ["p", "something ", function() { return "some text" }];		// cannot have child array that starts with text node

		var expcHtml = '<p>something some text</p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

//		console.log(vm.node.el.outerHTML);

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 3, createTextNode: 2 });
	});

/*
	QUnit.test('Body is function that returns single node', function(assert) {
		tpl = ["p", function() { return ["strong", "some text"] }];

		var expcHtml = '<p><strong>some text</strong></p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
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
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});

	QUnit.test('Child node is function that returns sub-array', function(assert) {
		tpl = ["p", [["p", "moo"], function() { [["p", "cow"], ["em", "some text"]] }]];

		var expcHtml = '<p>some text</p>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });
	});
	*/

	QUnit.skip('Attribute value is function/getter', function(assert) {
		tpl = ["input", {value: function() { return "moo"; }}];

		var expcHtml = '<input value="moo">';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, setAttribute: 1 }, {value: vm.node.el.value}, {value: "moo"});
	});

	QUnit.skip('Style object attr value is function/getter', function(assert) {
		tpl = ["input", {style: {width: function() { return "20px"; }}}];

		var expcHtml = '<input style="width: 20px;">';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	// style object value is function/getter
	// special props, id, className, _key, _ref?
})();


// QUnit.module("Keyed model & addlCtx replacement");