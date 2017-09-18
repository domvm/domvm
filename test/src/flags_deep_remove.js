QUnit.module("flags/DEEP_REMOVE");

(function() {
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
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { textContent: 1 });
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
		vm.redraw();
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
		vm.redraw();
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
			vm.config({hooks: hooks});

			return function() {
				return el("div", [
					el("div", "foo")
				])
			}
		}

		var vm = domvm.createView(View).mount(testyDiv);

		rem = true;
		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 4 }, ops, { willUnmounted: 1 });
	});

})();