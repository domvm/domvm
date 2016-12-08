QUnit.module("Elems & tag parsing");

(function() {
	QUnit.test('Empty elem: ["div"]', function(assert) {
		var tpl = el("div");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });
	});

	// TODO: explcit defineText test (covered already by unrelated tests)

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