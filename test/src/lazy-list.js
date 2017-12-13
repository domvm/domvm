QUnit.module("lazyList", function() {
	var el = domvm.defineElement, vm;

	var store = {
		selected: "b",
		items: [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
		]
	};

	function View1() {
		return function() {
			var items = domvm.lazyList(store.items, {
				key:  function(item) { return item.id; },
				diff: function(item) { return [store.selected === item.id, item.text]; },
			});

			return el("div", {_flags: domvm.KEYED_LIST | domvm.LAZY_LIST}, items.map(function(item) {
				return el("p", {class: store.selected === item.id ? 'selected' : null, _key: item.id}, [
					el("em", item.text),
				])
			}));
		};
	}

	function View2() {
		return function() {
			var items = domvm.lazyList(store.items, {
				diff: function(item) { return [store.selected === item.id, item.text]; },
			});

			return el("div", {_flags: domvm.LAZY_LIST}, items.map(function(item) {
				return el("p", {_data: item.id, class: store.selected === item.id ? 'selected' : null}, [
					el("em", item.text),
				])
			}));
		};
	}

	QUnit.test('Create (keyed)', function(assert) {
		instr.start();
		vm = domvm.createView(View1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 7, className: 1, insertBefore: 7, textContent: 3 });
	});

	QUnit.test('Redraw', function(assert) {
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });
	});

	QUnit.test('Clear', function(assert) {
		store.items = [];

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { textContent: 1 });
	});

	QUnit.test('Refill', function(assert) {
		store.items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
		];

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 6, className: 1, insertBefore: 6, textContent: 3 });
	});

	QUnit.test('Append one', function(assert) {
		store.items[3] = {id: "x", text: "X"};

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p><p><em>X</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('Replace one', function(assert) {
		store.items[1] = {id: "y", text: "Y"};

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p><em>Y</em></p><p><em>C</em></p><p><em>X</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, removeChild: 1, textContent: 1 });
	});

	QUnit.test('Create (non-keyed)', function(assert) {
		store.items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
		];

		instr.start();
		vm = domvm.createView(View2).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 7, className: 1, insertBefore: 7, textContent: 3 });
	});

	QUnit.test('Replace one', function(assert) {
		store.items[1] = {id: "y", text: "Y"};

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p><em>Y</em></p><p><em>C</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1, removeAttribute: 1 });		// should this be .className: 1?
	});

	QUnit.test('Attach', function(assert) {
		function View3() {
			return function() {
				var items = domvm.lazyList(store.items, {
					diff: function(item) { return [store.selected === item.id, item.text]; },
				});

				return el("div", {_flags: domvm.LAZY_LIST}, items.map(function(item) {
					return el("p", item.text)
				}));
			};
		}

		store.items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
		];

		instr.start();
		vm = domvm.createView(View3);
		var callCounts = instr.end();

		var expcHtml = '<div><p>A</p><p>B</p><p>C</p></div>';
		var targ = document.createElement("div");
		targ.innerHTML = expcHtml;
		var root = targ.firstChild;
		testyDiv.appendChild(root);
		var vm2 = domvm.createView(View3).attach(root);

		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { });

		store.items[1].text = "foo";
		instr.start();
		vm2.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p>A</p><p>foo</p><p>C</p></div>';
		evalOut(assert, vm2.node.el, vm2.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	// ensures that _lis is cleared off reused vnodes
	QUnit.test('Vnode reuse should not screw up LIS reconciler', function(assert) {
		store.selected = "b";
		store.items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "d", text: "D"},
			{id: "e", text: "E"},
		];

		instr.start();
		vm = domvm.createView(View1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p><p><em>D</em></p><p><em>E</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 11, className: 1, insertBefore: 11, textContent: 5 });

		store.items = [
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "e", text: "E"},
			{id: "a", text: "A"},
			{id: "d", text: "D"},
		];

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p class="selected"><em>B</em></p><p><em>C</em></p><p><em>E</em></p><p><em>A</em></p><p><em>D</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { insertBefore: 2 });

		store.items = [
			{id: "a", text: "A"},
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "d", text: "D"},
			{id: "e", text: "E"},
		];

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p><em>A</em></p><p class="selected"><em>B</em></p><p><em>C</em></p><p><em>D</em></p><p><em>E</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { insertBefore: 2 });

		store.items = [
			{id: "b", text: "B"},
			{id: "c", text: "C"},
			{id: "e", text: "E"},
			{id: "a", text: "A"},
			{id: "d", text: "D"},
		];

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><p class="selected"><em>B</em></p><p><em>C</em></p><p><em>E</em></p><p><em>A</em></p><p><em>D</em></p></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { insertBefore: 2 });
	});

	/*
	QUnit.test('Full patch', function(assert) {
	});
	*/
});