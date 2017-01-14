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

	QUnit.test('mount(el, true), root span -> a', function(assert) {
		var wrap = document.createElement("div");

		var sibA = document.createElement("em");
		sibA.textContent = "foo";

		var place = document.createElement("span");
		place.className = "placeholder";
		place.textContent = "{moo}";

		var sibB = document.createElement("strong");
		sibB.textContent = "bar";

		wrap.appendChild(sibA);
		wrap.appendChild(place);
		wrap.appendChild(sibB);

		testyDiv.appendChild(wrap);

		tpl = el("a", {href: "#"}, "bar");
		var expcHtml = '<a href="#">bar</a>';

		instr.start();
		var vm = domvm.createView(View).mount(place, true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 2, createElement: 1, insertBefore: 1, setAttribute: 1, textContent: 1 });

		assert.equal(wrap.outerHTML, '<div><em>foo</em><a href=\"#\">bar</a><strong>bar</strong></div>', 'Mounted into correct sibling position');
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

	QUnit.test('(body) empty [] -> []', function(assert) {
		tpl = el("span", []);
		var expcHtml = '<span></span>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		tpl = el("span", [tx("moo")]);
		var expcHtml = '<span>moo</span>';

		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createTextNode: 1, insertBefore: 1 });
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