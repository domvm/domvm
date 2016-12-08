QUnit.module("Lifecycle hooks");

// willRecycle, willReinsert

(function() {
	var vm;

	QUnit.test('will/did: mount/insert/remove/unmount (self)', function(assert) {
		var i = 0;

		var willMount = -1;
		var willInsert = -1;
		var didInsert = -1;
		var didMount = -1;

		var willUnmount = -1;
		var willRemove = -1;
		var didRemove = -1;
		var didUnmount = -1;

		function A(vm) {
			vm.hook({
				willMount: function(vm) {
					willMount = i++;
				},
				didMount: function(vm) {
					didMount = i++;
				},
				willUnmount: function(vm) {
					willUnmount = i++;
				},
				didUnmount: function(vm) {
					didUnmount = i++;
				}
			});

			return function() {
				var hooks = {
					willInsert: function(node) {
						willInsert = i++;
					},
					didInsert: function(node) {
						didInsert = i++;
					},
					willRemove: function(node) {
						willRemove = i++;
					},
					didRemove: function(node) {
						didRemove = i++;
					},
				};

				return el("div", {_hooks: hooks}, "abc");
			};
		}

		instr.start();
		vm = domvm.createView(A).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>abc</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		vm.unmount();

		assert.equal(willMount,		0, "willMount");
		assert.equal(willInsert,	1, "willInsert");
		assert.equal(didInsert,		2, "didInsert");
		assert.equal(didMount,		3, "didMount");
		assert.equal(willUnmount,	4, "willUnmount");
		assert.equal(willRemove,	5, "willRemove");
		assert.equal(didRemove,		6, "didRemove");
		assert.equal(didUnmount,	7, "didUnmount");
	});

	QUnit.test('willUpdate (root/explicit)', function(assert) {
		function A(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("div", model.text);
			};
		}

		instr.start();
		vm = domvm.createView(A, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>abc</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		instr.start();
		vm.update({text: "def"}, true);
		var callCounts = instr.end();

		var expcHtml = '<div>def</div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('willUpdate (sub-view/implicit)', function(assert) {
		function B(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("div", [
					vw(C, model, false)
				]);
			};
		}

		function C(vm, model) {
			vm.hook({
				willUpdate: function(vm, newModel) {
					model = newModel;
				}
			});

			return function() {
				return el("strong", model.text);
			};
		}

		instr.start();
		vm = domvm.createView(B, {text: "abc"}, false).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>abc</strong></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, textContent: 1, insertBefore: 2 });

		instr.start();
		vm.update({text: "def"}, true);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>def</strong></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});
})();