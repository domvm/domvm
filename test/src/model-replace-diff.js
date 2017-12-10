QUnit.module("Model replace & vm.diff()");

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
				vw(ViewA, model)
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
		vmA = domvm.createView(ViewA, dataA).mount(testyDiv);
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
		vmB = domvm.createView(ViewB, dataA).mount(testyDiv);
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
			vm.config({
				diff: function(vm, model) {
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
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { });

		assert.equal(redraws, 1, "Subview redraws");

		model.text = "fabric";

		var expcHtml = '<strong class="classy">fabric</strong>';

		instr.start();
		vmA.redraw();
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
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Ad-hoc model wrapper (unkeyed)', function(assert) {
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
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { });

		myText = "cow";
		var expcHtml = '<div id="viewC"><div id="viewD"><span>bleh</span><strong>cow</strong></div></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmC.node.el, vmC.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Do not unmount subviews when parent is diff some children are not', function(assert) {
		var vmE = null;

		const ViewE = {
		//	diff: function(vm, items) {
		//		return [items];
		//	},
			render: function(vm, items) {
				return el("ul", items.map(function(item) {
					return vw(ViewD, item, item.id);
				}));
			}
		};

		const ViewD = {
			diff: function(vm, item) {
				return [item];
			},
			render: function(vm, item) {
				return el("li", item.text);
			}
		};

		var items = [
			{text: "foo", id: 1},
			{text: "bar", id: 2},
		];

		instr.start();
		vmE = domvm.createView(ViewE, items).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>foo</li><li>bar</li></ul>';
		evalOut(assert, vmE.node.el, vmE.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });

		instr.start();
		var items2 = items.slice();
		items2.reverse();
		vmE.update(items2);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>bar</li><li>foo</li></ul>';
		evalOut(assert, vmE.node.el, vmE.html(), expcHtml, callCounts, { insertBefore: 1 });
	});

	// ensures that _lis is cleared off reused vnodes
	QUnit.test('Vnode reuse should not screw up LIS reconciler', function(assert) {
		var vmF = null;

		const ViewF = {
			render: function(vm, items) {
				return el("ul", items.map(function(item) {
					return vw(ViewG, item, item.id);
				}));
			}
		};

		const ViewG = {
			render: function(vm, item) {
				return vm.node || el("li", item.text);
			}
		};

		var items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "d", text: "D"},
			{id: "e", text: "E"},
		];

		instr.start();
		vmF = domvm.createView(ViewF, items).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>A</li><li>B</li><li>C</li><li>D</li><li>E</li></ul>';
		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { createElement: 6, insertBefore: 6, textContent: 5 });

		items = [
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "e", text: "E"},
			{id: "a", text: "A"},
			{id: "d", text: "D"},
		];

		instr.start();
		vmF.update(items);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>B</li><li>C</li><li>E</li><li>A</li><li>D</li></ul>';
		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { insertBefore: 2 });

		var items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "d", text: "D"},
			{id: "e", text: "E"},
		];

		instr.start();
		vmF.update(items);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>A</li><li>B</li><li>C</li><li>D</li><li>E</li></ul>';
		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { insertBefore: 2 });

		items = [
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "e", text: "E"},
			{id: "a", text: "A"},
			{id: "d", text: "D"},
		];

		instr.start();
		vmF.update(items);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>B</li><li>C</li><li>E</li><li>A</li><li>D</li></ul>';
		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	QUnit.skip('diff by object identity', function(assert) {
		// diff: (vm, model) => model; rather than [model] or {model: model}
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