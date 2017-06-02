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