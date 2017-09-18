QUnit.module("Model-view persistence, vm init, DOM reuse");

(function() {
	var dataA = {foo: "foo", bar: "bar"},
		dataB = {foo: "xxx", bar: "yyy"},
		vmA = null;

	function ViewA(vm) {
		vmA = vm;
/*
		vm.config({hooks: {
			willUnmount: function() {
				console.log("willUnmount");
			},
			didUnmount: function() {
				console.log("willUnmount");
			}
		}});
*/
		return function(vm, model) {
			return el("div", [
				el("span", model.foo),
				el("br"),
				el("strong", model.bar),
			]);
		};
	}

	QUnit.test('Persistent model correctly rendered', function(assert) {
		var expcHtml = '<div><span>foo</span><br><strong>bar</strong></div>';

		instr.start();
		vmA = domvm.createView(ViewA, dataA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 2 });
	});
/*
	// should this force unmount the vm and re-create
	QUnit.test('Persistent model imperatively swapped out (should fail)', function(assert) {
		var expcHtml = '<div><span>xxx</span><br><strong>yyy</strong></div>';

		instr.start();
		vmA.update(dataB, true);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 2 });
	});
*/
	QUnit.test('Same model/handle, diff sib views', function(assert) {
		function ViewX(vm, model) {
			return function() {
				return el("div", [
					vw(ViewY, model),
					vw(ViewZ, model),
				]);
			};
		}

		function ViewY(vm, model) {
			return function() {
				return el("em", model.a);
			};
		}

		function ViewZ(vm, model) {
			return function() {
				return el("strong", model.b);
			};
		}

		var model = {
			a: "foo",
			b: "bar",
		};

		var expcHtml = '<div><em>foo</em><strong>bar</strong></div>';

		instr.start();
		var vm = domvm.createView(ViewX, model).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });
	});
})();