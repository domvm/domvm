QUnit.module("emit()", function() {
	var data;

	function reset() {
		data = { abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" };
	}

	var vmA, vmB, vmC;

	function ViewA(vm) {
		vmA = vm;

		vm.cfg({
			onemit: {
				"abc": function() { data.abc += "a"; },
				"ab": function() { data.ab += "a"; },
				"ac": function() { data.ac += "a"; },
				"a": function() { data.a += "a"; },
			}
		});

		return function() {
			return el("#a", [
				el("strong", [
					vw(ViewB)
				])
			]);
		};
	}

	function ViewB(vm) {
		vmB = vm;

		vm.cfg({
			onemit: {
				"abc": function() { data.abc += "b"; },
				"ab": function() { data.ab += "b"; },
				"bc": function() { data.bc += "b"; },
				"b": function() { data.b += "b"; },
			}
		});

		return function() {
			return el("#b", [
				el("em", [
					vw(ViewC)
				])
			]);
		};
	}

	function ViewC(vm) {
		vmC = vm;

		vm.cfg({
			onemit: {
				"abc": function() { data.abc += "c"; },
				"bc": function() { data.bc += "c"; },
				"ac": function() { data.ac += "c"; },
				"c": function() { data.c += "c"; },
			}
		});

		return function() {
			return el("#c", "Hello");
		};
	}

	function mkTest(assert, vm) {
		return function test(ev, exp) {
			reset();
			vm.emit(ev);
			assert.propEqual(data, exp, ev);
		}
	}

	QUnit.test('Create', function(assert) {
		instr.start();
		domvm.createView(ViewA).mount();
		var callCounts = instr.end();

		var expcHtml = '<div id="a"><strong><div id="b"><em><div id="c">Hello</div></em></div></strong></div>';

		evalOut(assert, vmA.node.el, vmA.html(), expcHtml, callCounts, { createElement: 5, insertBefore: 4, textContent: 1, id: 3});
	});

	QUnit.test('vmC', function(assert) {
		var test = mkTest(assert, vmC);

		test("abc",		{ abc: "c", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "b", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "c", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "b", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "c", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "c" });
	});

	QUnit.test('vmB', function(assert) {
		var test = mkTest(assert, vmB);

		test("abc",		{ abc: "b", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "b", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "a", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "b", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "b", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
	});

	QUnit.test('vmA', function(assert) {
		var test = mkTest(assert, vmA);

		test("abc",		{ abc: "a", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("a",		{ abc: "", a: "a", ab: "", ac: "", b: "", bc: "", c: "" });
		test("ab",		{ abc: "", a: "", ab: "a", ac: "", b: "", bc: "", c: "" });
		test("ac",		{ abc: "", a: "", ab: "", ac: "a", b: "", bc: "", c: "" });
		test("b",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("bc",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
		test("c",		{ abc: "", a: "", ab: "", ac: "", b: "", bc: "", c: "" });
	});

	QUnit.test('Emit w/args', function(assert) {
		assert.expect(2);

		var vmY;

		function ViewY(vm) {
			vmY = vm;

			return function() {
				return el("div", "meh");
			};
		}

		function ViewX(vm) {
			vm.cfg({
				onemit: {
					testEv: function(arg1, arg2) {
						assert.equal(arg1, "arg1", "Arg1");
						assert.equal(arg2, "arg2", "Arg2");
					}
				}
			});

			return function() {
				return el("div", [
					vw(ViewY)
				]);
			};
		}

		domvm.createView(ViewX).mount();

		vmY.emit("testEv", "arg1", "arg2");
	});
});