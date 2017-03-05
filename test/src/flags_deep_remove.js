QUnit.module("flags/DEEP_REMOVE");

(function() {
/*
	var hooks = {
		willUnmount: function(vm) {
			console.log("willUnmount", vm);
		}
	};

	var _hooks = {
		willRemove: function(node) {
			console.log("willRemove", node);
		}
	};

	var innerA = true;
	var aHooks = false;
	var innerB = true;

	function ViewA() {
		return function() {
			return el("div", [
				innerA ? el("div", [
					el("strong", aHooks ? {_hooks: _hooks} : null, "foo"),
					el("div", [
						el("div", "a1"),
						el("div", "a2"),
						el("div", "a3"),
					]),
					el("div", "b"),
					el("div", "c"),
					innerB ? vw(ViewB) : null,
				]) : null
			]);
		};
	}

	var bHooks = true,
		bHooks2 = true;

	function ViewB(vm) {
		bHooks && vm.hook(hooks);

		return function() {
			return el("div", [
				el("strong", bHooks2 ? {_hooks: _hooks} : null, "bar"),
			]);
		};
	}

	var vm;

	QUnit.test('Create', function(assert) {
		instr.start();
		vm = domvm.createView(ViewA).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div><strong>foo</strong><div><div>a1</div><div>a2</div><div>a3</div></div><div>b</div><div>c</div><div><strong>bar</strong></div></div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 11, textContent: 7, insertBefore: 11 });

		setTimeout(function() {
			innerA = false;
			instr.start();
			vm.redraw(true);
			console.log(instr.end());
		}, 1000)
	});
*/
	QUnit.test('Off by default', function(assert) {
		var rem = false;

		function View() {
			return function() {
				return (
					el("div", rem ? null : [
						el("div", [
							el("div", [
								el("div", "foo")
							])
						]),
						el("div", [
							el("div", [
								el("div", "bar")
							])
						])
					])
				);
			}
		}

		var vm = domvm.createView(View).mount(testyDiv);

		rem = true;
		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 2 });
	});

	QUnit.test('On for deep willRemove', function(assert) {
		var rem = false;

		var ops = {
			willRemoved: 0,
		};

		var _hooks = {
			willRemove: function() {
				ops.willRemoved++;
			}
		};

		function View() {
			return function() {
				return (
					el("div", rem ? null : [
						el("div", [
							el("div", [
								el("div", {_hooks: _hooks}, "foo")
							])
						]),
						el("div", [
							el("div", [
								el("div", "bar")
							])
						])
					])
				);
			}
		}

		var vm = domvm.createView(View).mount(testyDiv);

		rem = true;
		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 4 }, ops, { willRemoved: 1 });
	});

	QUnit.test('On for deep willRemove within subview', function(assert) {
		var rem = false;

		var ops = {
			willRemoved: 0,
		};

		var _hooks = {
			willRemove: function() {
				ops.willRemoved++;
			}
		};

		function View() {
			return function() {
				return (
					el("div", rem ? null : [
						el("div", [
							el("div", [
								vw(ViewB)
							])
						]),
						el("div", [
							el("div", [
								el("div", "bar")
							])
						])
					])
				);
			}
		}

		function ViewB() {
			return function() {
				return el("div", [
					el("div", {_hooks: _hooks}, "foo")
				])
			}
		}

		var vm = domvm.createView(View).mount(testyDiv);

		rem = true;
		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 5 }, ops, { willRemoved: 1 });
	});

	QUnit.test('On for deep willUnmount within subview', function(assert) {
		var rem = false;

		var ops = {
			willUnmounted: 0,
		};

		var hooks = {
			willUnmount: function() {
				ops.willUnmounted++;
			}
		};

		function View() {
			return function() {
				return (
					el("div", rem ? null : [
						el("div", [
							el("div", [
								vw(ViewB)
							])
						]),
						el("div", [
							el("div", [
								el("div", "bar")
							])
						])
					])
				);
			}
		}

		function ViewB(vm) {
			vm.hook(hooks);

			return function() {
				return el("div", [
					el("div", "foo")
				])
			}
		}

		var vm = domvm.createView(View).mount(testyDiv);

		rem = true;
		instr.start();
		vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 4 }, ops, { willUnmounted: 1 });
	});

})();