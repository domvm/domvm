QUnit.module("Imperative VMs", function() {
	var modelA = {val: "A"},
		modelB = {val: "B"},
		modelC = {val: "C"},
		modelD = {val: "D"};

	var vmA, vmB, vmC, vmD, vmE, vmF;

	function ViewA(vm, model) {
		vmA = vm;
		vmB = domvm.createView(ViewB, modelB);

		return function() {
			return el("div", [
				tx(model.val),
				iv(vmB),
				vw(ViewC, modelC),
			]);
		};
	}

	function ViewB(vm, model) {
		vmB = vm;

		return function() {
			return el("strong", model.val);
		};
	}

	function ViewC(vm, model) {
		vmC = vm;
		vmD = domvm.createView(ViewD, modelD);

		return function() {
			return el("em", [
				tx(model.val),
				iv(vmD),
			]);
		};
	}

	function ViewD(vm, model) {
		vmD = vm;

		return function() {
			return el("span", model.val);
		};
	}

	function ViewE(vm) {
		return function() {
			return el("span", "moo");
		};
	}

	function ViewF(vm) {
		return function() {
			return el("div", vmE);
		};
	}

	QUnit.test('Simple injectView + mod', function(assert) {
		function ViewG() {
			return function() {
				return el("div", [
					iv(vmH)
				]);
			};
		}

		function ViewH() {
			return function() {
				return el("span", hVal);
			};
		}

		var vmH = domvm.createView(ViewH);

		var hVal = "H";

		instr.start();
		var vmG = domvm.createView(ViewG).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><span>H</span></div>';
		evalOut(assert, vmG.node.el, vmG.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		hVal = "H+";

		instr.start();
		vmG.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><span>H+</span></div>';
		evalOut(assert, vmG.node.el, vmG.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('Initial view built correctly', function(assert) {
		var expcHtml = '<div>A<strong>B</strong><em>C<span>D</span></em></div>';

		instr.start();
		domvm.createView(ViewA, modelA).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 4, createTextNode: 2, insertBefore: 6, textContent: 2 });
	});

	QUnit.test('Calling vm.config() returns the vm and can be chained to mount()', function(assert) {
		var expcHtml = '<div>A<strong>B</strong><em>C<span>D</span></em></div>';

		instr.start();
		domvm.createView(ViewA, modelA).config({}).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 4, createTextNode: 2, insertBefore: 6, textContent: 2 });
	});

	QUnit.test('A mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B</strong><em>C<span>D</span></em></div>';

		modelA.val = "A+";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('B mod, B redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		modelB.val = "B+";

		instr.start();
		vmB.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D</span></em></div>';

		instr.start();
		vmB.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, {});
	});

	QUnit.test('D mod, A redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		modelD.val = "D+";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('C redraw (should do nothing)', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C<span>D+</span></em></div>';

		instr.start();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, {});
	});

	QUnit.test('C mod, A redraw, C redraw', function(assert) {
		var expcHtml = '<div>A+<strong>B+</strong><em>C+<span>D+</span></em></div>';

		modelC.val = "C+";

		instr.start();
		vmA.redraw();
		vmC.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 1 });
	});

	QUnit.test('A mod, C mod, A redraw', function(assert) {
		var expcHtml = '<div>A++<strong>B+</strong><em>C++<span>D+</span></em></div>';

		modelA.val = "A++";
		modelC.val = "C++";

		instr.start();
		vmA.redraw();
		var callCounts = instr.end();

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { nodeValue: 2 });
	});

	/* jsonml
	QUnit.skip('First-child VM should not be confused with props object', function(assert) {
		vmE = domvm.createView(ViewE);

		var expcHtml = '<div><span>moo</span></div>';

		instr.start();
		vmF = domvm.createView(ViewF).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vmF.node.el, vmF.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});
	*/

	QUnit.test('Avoid grafting unmounted sub-vm nodes', function(assert) {
		var a = '';

		function View() {
			return function() {
				return el("div", typeof a == "string" ? a : [iv(a)]);
			};
		}

		function A() {
			var i = 0;
			return function() {
				return el("div", "A" + i++);
			};
		}

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		a = domvm.createView(A);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><div>A0</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 2 });
	});

	QUnit.test("Replace root node during sub-vm swapping", function(assert) {
		function App() {
			this.a = null;
			this.b = null;

			this.vm2 = domvm.createView(View2, this);
			this.vm  = domvm.createView(View, this);
		}

		function View(vm, app) {
			return function() {
				if (app.a == null)
					return el("h3", "Loading 1...");
				if (app.b != null)
					return el(".one", [
						iv(app.vm2)
					]);

				return el(".one", "View 1");
			};
		}

		function View2(vm, app) {
			return function() {
				if (app.a == null)
					return el("h3", "Loading 2...");

				return el(".two", "View 2");
			};
		}

		var app = new App();

		instr.start();
		app.vm.mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<h3>Loading 1...</h3>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		app.a = [1, 2];

		instr.start();
		app.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div class="one">View 1</div>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });

		app.b = 0;

		instr.start();
		app.vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div class="one"><div class="two">View 2</div></div>';
		evalOut(assert, app.vm.node.el, app.vm.html(), expcHtml, callCounts, { className: 1, createElement: 1, insertBefore: 1, textContent: 2 });
	});

	QUnit.test("Mount new imperative vm children", function(assert) {
		var type = "a";

		function App(vm) {
			var a = domvm.createView(ViewA);
			var b = domvm.createView(ViewB);

			function toggle() {
				type = type === "a" ? "b" : "a";
				vm.redraw(true);
			}

			return function() {
				return el("div", [
					type === 'a' ? iv(a) : iv(b)
				]);
			};
		}

		function ViewA() {
			return function() {
				return el("div", "a");
			};
		}

		function ViewB() {
			return function() {
				return el("div", "b");
			};
		}

		instr.start();
		var vm = domvm.createView(App).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div>a</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		type = "b";

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><div>b</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 1 });
	});

	QUnit.test("VM remounted in different sub-tree", function(assert) {
		var inLeft = false, ts = 0;

		function AppView() {
			return function() {
				return el("div", [
					el("div", [
						inLeft && iv(chatView)
					]),
					el("div", [
						!inLeft && iv(chatView)
					]),
				])
			};
		}

		function ChatView() {
			ts += 1;

			return function(vm, msg) {
				return el("div", ts + ": " + msg);
			};
		}

		instr.start();
		var chatView = domvm.createView(ChatView, "Hello World!");
		var appView = domvm.createView(AppView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div></div><div><div>1: Hello World!</div></div></div>';
		evalOut(assert, appView.node.el, appView.html(), expcHtml, callCounts, { createElement: 4, insertBefore: 4, textContent: 1 });

		inLeft = true;

		instr.start();
		appView.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><div><div>1: Hello World!</div></div><div></div></div>';
		evalOut(assert, appView.node.el, appView.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, removeChild: 1, textContent: 2 });
	});

	// GC...
	QUnit.test("Unref .node of unmounted sub-vms", function(assert) {
		var rendSub = true;

		var vm2 = domvm.createView(View2);

		function View1() {
			return function() {
				return el("div", [
					rendSub && iv(vm2)
				]);
			};
		}

		function View2() {
			var iter = 0;

			return function() {
				return el("strong", iter++);
			};
		}

		var rendSub2 = true;
		var vm2_2 = domvm.createView(View2);
		var vm2_3 = domvm.createView(View2);

		function View3() {
			return function() {
				return el("h2", [
					rendSub2 && iv(vm2_2),
					iv(vm2_3),
				]);
			};
		}

		instr.start();
		var vm = domvm.createView(View1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>0</strong></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		rendSub = false;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { textContent: 1 });
		assert.equal(vm2.node, null, ".node set to null on fast clear");

		rendSub = true;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><strong>1</strong></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1, textContent: 1 });

		instr.start();
		var vm = domvm.createView(View3).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<h2><strong>0</strong><strong>0</strong></h2>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 3, textContent: 2 });

		rendSub2 = false;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<h2><strong>1</strong></h2>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1, nodeValue: 1 });
		assert.equal(vm2_2.node, null, ".node set to null on single removeChild");

		rendSub2 = true;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<h2><strong>1</strong><strong>2</strong></h2>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {   createElement: 1, textContent: 1, insertBefore: 1, nodeValue: 1 });

		var rendSub4 = true;

		var vm5 = domvm.createView(View5);
		var vm6 = domvm.createView(View6);
		var vm7 = domvm.createView(View6);

		function View4() {
			return function() {
				return el("div", [
					rendSub4 && el("div", [
						iv(vm5),
					]),
					iv(vm7),
				]);
			};
		}

		function View5() {
			return function() {
				return el("div", [
					iv(vm6),
				]);
			};
		}

		function View6() {
			return function() {
				return el("div", {_ref: "hi"}, "hi");
			};
		}

		instr.start();
		var vm = domvm.createView(View4).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div><div><div>hi</div></div></div><div>hi</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 5, insertBefore: 5, textContent: 2 });

		rendSub4 = false;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><div>hi</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeChild: 1 });
		assert.equal(vm5.node, null, ".node set to null on single removeChild");
		assert.equal(vm6.node, null, ".node set to null on single removeChild");
		assert.equal(vm6.refs, null, ".refs set to null on single removeChild");
	});

	QUnit.test("Update imperative views with new data", function(assert) {
		var vm2 = domvm.createView(View2, {foo: 0});

		var newData = false;

		function View1() {
			return function() {
				return el("div", [
					iv(vm2, newData ? {foo: 1} : null)
				]);
			};
		}

		function View2() {
			return function(vm, data) {
				return el("strong", data.foo);
			};
		}

		instr.start();
		var vm = domvm.createView(View1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><strong>0</strong></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });

		newData = true;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div><strong>1</strong></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });
	});
});