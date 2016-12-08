QUnit.module("Non-VNodes");

(function() {
	function ViewAny(vm) {
		return function() { return tpl; };
	}

	var tpl = null,
		vm = null;

	QUnit.test('Values are properly coerced or ignored', function(assert) {
		tpl = el("div", [0, 25, "", NaN, 19, undefined, function () {return "blah";}, [], Infinity, null, {}, true, "yo", false]);

		var expcHtml = '<div>025NaN19function () {return "blah";}Infinity[object Object]trueyo</div>';

		instr.start();
		vm = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 2, createTextNode: 1 });
	});

	QUnit.test('Mutation of some nodes is consistent and does correct DOM ops', function(assert) {
		tpl = el("div", [
			0,
			el("span", "moo"),
			undefined,
			function () {return "blah";},
			[
				el("span", "bar"),
				el("span","baz"),
			],
			Infinity,
			null,
			false
		]);

		var expcHtml = '<div>0<span>moo</span>function () {return "blah";}<span>bar</span><span>baz</span>Infinity</div>';

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

	/* jsonml
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
	*/

	QUnit.test('Convert plain values in body [] to defineText(val)', function(assert) {
		tpl = el("div", [
			"a",
			el("i", "b"),
			"c",
			"d",
			tx("e"),
		]);

		var expcHtml = '<div>a<i>b</i>cde</div>';
		instr.start();
		var vm2 = domvm.createView(ViewAny).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { createElement: 2, createTextNode: 2, insertBefore: 4, textContent: 1 });
	});
})();