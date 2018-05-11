QUnit.module("vnode.patch()", function() {
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

	function TestView2() {
		return function() {
			return el(".foo", "a");
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

	QUnit.test('Static class prepend', function(assert) {
		instr.start();
		vm = domvm.createView(TestView2).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div class="foo">a</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { className: 1, createElement: 1, textContent: 1, insertBefore: 1 });

		instr.start();
		vm.node.patch({style: {margin: 5}});
		var callCounts = instr.end();

		var expcHtml = '<div class="foo" style="margin: 5px;">a</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });
	});
});