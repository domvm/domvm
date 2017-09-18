QUnit.module("flags/DEEP_REMOVE");

(function() {
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
		bHooks && vm.config({hooks: hooks});

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
			vm.redraw();
			console.log(instr.end());
		}, 1000)
	});
})();