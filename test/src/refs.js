QUnit.module("refs & didRedraw()");

(function() {
	QUnit.test('didredraw(true) is called on self', function(assert) {
		assert.expect(2);

		var done = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Self didredraw(true)");
					assert.ok(vm.refs.mySpan3.el === document.getElementById("zzz"), "Self ref");
				//	console.log(vm.refs);
					done();
				}
			});

			return function() {
				return el("span#zzz", {_ref: "mySpan3"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw(true);
	});

	QUnit.test('didredraw(true) is called on subviews when parent redraws', function(assert) {
		assert.expect(4);

		var done1 = assert.async();
		var done2 = assert.async();

		function MyView(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Parent didredraw(true)");
					assert.ok(vm.refs.mySpan1.el === document.getElementById("xxx"), "Parent ref");
				//	console.log(vm.refs);
					done2();
				}
			});

			return function() {
				return el("span#xxx", {_ref: "mySpan1"}, [
					vw(MyView2)
				]);
			};
		}

		function MyView2(vm) {
			vm.hook({
				didRedraw: function() {
					assert.ok(true, "Child after()");
					assert.ok(vm.refs.mySpan2.el === document.getElementById("yyy"), "Child ref");
				//	console.log(vm.refs);
					done1();
				}
			});

			return function() {
				return el("span#yyy", {_ref: "mySpan2"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw(true);

	//	setTimeout(done, 1);

		// todo: ensure refs get re-ref'd on redraw/reuse
	});

	// Exposed/bubbled refs

	var footVm;

	var data = {
		a: "foo",
		b: "bar",
		c: "baz",
	};

	function updateData() {
		data.a = "moo";
		data.b = "cow";
		data.c = "now";
	}

	function AppView(vm, data) {
		vm.on("redrawMainAndFooter", function() {
			vm.refs.main.vm().redraw(true);
			vm.refs.footer.vm().redraw(true);
		});

		return function() {
			return el("div", [
				tx(data.a),
				vw(MainView, data),
				vw(FooterView, data, "^footer"),
			]);
		};
	}

	function MainView(vm, data) {
		return function() {
			return el("strong", {_ref: "^main"}, data.b);
		};
	}

	function FooterView(vm, data) {
		footVm = vm;

		return function() {
			return el("em", data.c);
		};
	}

	QUnit.test('Exposed refs', function(assert) {
		instr.start();
		var vm = domvm.createView(AppView, data).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>bar</strong><em>baz</em></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, insertBefore: 4, textContent: 2, createTextNode: 1 });

		updateData();

		instr.start();
		vm.emit("redrawMainAndFooter");
		var callCounts = instr.end();

		var expcHtml = '<div>foo<strong>cow</strong><em>now</em></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 2 });
	});


	function TestView() {
		return function() {
			return el("div", {_ref: "a.b.c"});
		}
	}

	function TestView1() {
		return function() {
			return el("div", [
				vw(TestView2)
			]);
		}
	}

	var vm2;
	function TestView2(vm) {
		vm2 = vm;
		return function() {
			return el("div", {_ref: "^a.b.c"});
		}
	}

	QUnit.test('Namespaced a.b.c', function(assert) {
		instr.start();
		var vm = domvm.createView(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		assert.equal(vm.refs.a.b.c, vm.node);
	});

	QUnit.test('Namespaced & exposed ^a.b.c', function(assert) {
		instr.start();
		var vm = domvm.createView(TestView1).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div><div></div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		assert.equal(vm.refs.a.b.c, vm2.node);
	});
})();