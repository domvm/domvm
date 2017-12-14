QUnit.module("refs & didRedraw", function() {
	QUnit.test('didRedraw is called on self', function(assert) {
		assert.expect(2);

		var done = assert.async();

		function MyView(vm) {
			vm.config({hooks: {
				didRedraw: function() {
					assert.ok(true, "Self didRedraw");
					assert.ok(vm.refs.mySpan3.el === document.getElementById("zzz"), "Self ref");
				//	console.log(vm.refs);
					done();
				}
			}});

			return function() {
				return el("span#zzz", {_ref: "mySpan3"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw();
	});

	QUnit.test('didRedraw is called on subviews when parent redraws', function(assert) {
		assert.expect(4);

		var done1 = assert.async();
		var done2 = assert.async();

		function MyView(vm) {
			vm.config({hooks: {
				didRedraw: function() {
					assert.ok(true, "Parent didRedraw");
					assert.ok(vm.refs.mySpan1.el === document.getElementById("xxx"), "Parent ref");
				//	console.log(vm.refs);
					done2();
				}
			}});

			return function() {
				return el("span#xxx", {_ref: "mySpan1"}, [
					vw(MyView2)
				]);
			};
		}

		function MyView2(vm) {
			vm.config({hooks: {
				didRedraw: function() {
					assert.ok(true, "Child after()");
					assert.ok(vm.refs.mySpan2.el === document.getElementById("yyy"), "Child ref");
				//	console.log(vm.refs);
					done1();
				}
			}});

			return function() {
				return el("span#yyy", {_ref: "mySpan2"}, "foo");
			};
		}

		var vm = domvm.createView(MyView).mount(testyDiv);

		vm.redraw();

	//	setTimeout(done, 1);

		// todo: ensure refs get re-ref'd on redraw/reuse
	});

	QUnit.test('Namespaced a.b.c', function(assert) {
		function TestView() {
			return function() {
				return el("div", {_ref: "a.b.c"});
			}
		}

		instr.start();
		var vm = domvm.createView(TestView).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, insertBefore: 1 });

		assert.equal(vm.refs.a.b.c, vm.node);
	});
});