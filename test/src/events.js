QUnit.module("Events", function() {
	var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

	function doClick(targ) {
		if (isIE11) {
			var e = document.createEvent("Event");
			e.initEvent("click", true, true);
			var origPrevent = e.preventDefault;
			e.preventDefault = function() {
				origPrevent.call(this);
				this.defaultPrevented = true;
			};
			targ.dispatchEvent(e);
		}
		else {
			targ.dispatchEvent(new MouseEvent('click', {
				view: window,
				bubbles: true,
				cancelable: true
			}));
		}
	}

	var counts;

	function reset() {
		counts = {
			event: null,
			args1: null,
			args2: null,
			set: 0,
			unset: 0,
			clicks1: 0,
			clicks2: 0,
			vmOnArgs: null,
			globalOnArgs: null,
		};
	}

	reset();

	function click1() {
		counts.args1 = Array.prototype.slice.call(arguments);
		counts.clicks1++;
	}

	function click2() {
		counts.args2 = Array.prototype.slice.call(arguments);
		counts.clicks2++;
		return false;
	}

	domvm.cfg({
		onevent: function(e, node, vm, data, args) {
			counts.globalOnArgs = Array.prototype.slice.call(arguments);
		}
	});

	function View(vm) {
		vm.cfg({
			onevent: function(e, node, vm, data, args) {
				counts.vmOnArgs = Array.prototype.slice.call(arguments);
			}
		});

		return function() { return tpl; }
	}

	var vm, tpl;

	QUnit.test("Basic", function(assert) {
		reset();

		tpl = el("div", [el("input", {onclick: click1})]);

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args1.length, 4);
		assert.ok(counts.args1[0] instanceof Event);

		reset();

		// no re-bind on redraw
		tpl = el("div", [el("input", {onclick: click1})]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		reset();

		// mutate
		tpl = el("div", [el("input", {onclick: click2})]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});

/*		// return false -> preventDefault + stopPropagation
		// todo: spy on Event.prototype.stopPropagation
		doClick(vm.node.body[0].el);
		// IE11 has problems setting defaultPrevented on custom events
		if (!isIE11)
			assert.equal(counts.args2[0].defaultPrevented, true);
*/
		reset();

		// remove
		tpl = el("div", [el("input", {onclick: null})]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});

		reset();
	});

	QUnit.test("Parameterized", function(assert) {
		tpl = el("div", [el("input", {onclick: [click1, 1, 2]})]);

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args1.length, 6);
		assert.equal(counts.args1[0], 1);
		assert.equal(counts.args1[1], 2);
		assert.ok(counts.args1[2] instanceof Event);
		assert.equal(counts.args1[3], vm.node.body[0]);
		assert.equal(counts.args1[4], vm);
		assert.equal(counts.args1[5], vm.data);

		// global & vm-level onevent args
		assert.ok(counts.globalOnArgs[0] instanceof Event);
		assert.equal(counts.globalOnArgs[1], vm.node.body[0]);
		assert.equal(counts.globalOnArgs[2], vm);
		assert.equal(counts.globalOnArgs[3], vm.data);
		assert.deepEqual(counts.globalOnArgs[4], [1,2]);

		assert.ok(counts.vmOnArgs[0] instanceof Event);
		assert.equal(counts.vmOnArgs[1], vm.node.body[0]);
		assert.equal(counts.vmOnArgs[2], vm);
		assert.equal(counts.vmOnArgs[3], vm.data);
		assert.deepEqual(counts.vmOnArgs[4], [1,2]);

		reset();

		// no re-bind on redraw, even with handler & param changes
		tpl = el("div", [el("input", {onclick: [click2, 3, 4]})]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args2.length, 6);
		assert.equal(counts.args2[0], 3);
		assert.equal(counts.args2[1], 4);
		assert.ok(counts.args2[2] instanceof Event);
		// IE11 has problems setting defaultPrevented on custom events
		!isIE11 && assert.equal(counts.args2[2].defaultPrevented, true);
		assert.equal(counts.args2[3], vm.node.body[0]);
		assert.equal(counts.args2[4], vm);
		assert.equal(counts.args2[5], vm.data);

		reset();

		// TODO? test mutating basic <-> fancy handlers: [click1] <-> click2

		// remove
		tpl = el("div", [el("input", {onclick: null})]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		// TOFIX: when last listener of this type is dropped, remove top-level capturing listener
	//	evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		reset();

		// click on inner node bubbles to ancestor
		tpl = el("div", {onclick: [click1, 5, 6]}, [el("input")]);
		vm.redraw();

		doClick(vm.node.body[0].el);
		assert.equal(counts.args1.length, 6);
		assert.equal(counts.args1[0], 5);
		assert.equal(counts.args1[1], 6);
		assert.ok(counts.args1[2] instanceof Event);
		assert.equal(counts.args1[3], vm.node.body[0]);
		assert.equal(counts.args1[4], vm);
		assert.equal(counts.args1[5], vm.data);

		// global & vm-level onevent args
		assert.ok(counts.globalOnArgs[0] instanceof Event);
		assert.equal(counts.globalOnArgs[1], vm.node.body[0]);
		assert.equal(counts.globalOnArgs[2], vm);
		assert.equal(counts.globalOnArgs[3], vm.data);
		assert.deepEqual(counts.globalOnArgs[4], [5,6]);

		assert.ok(counts.vmOnArgs[0] instanceof Event);
		assert.equal(counts.vmOnArgs[1], vm.node.body[0]);
		assert.equal(counts.vmOnArgs[2], vm);
		assert.equal(counts.vmOnArgs[3], vm.data);
		assert.deepEqual(counts.vmOnArgs[4], [5,6]);

		reset();
	});
/*
	QUnit.test("Fancy (delegated)", function(assert) {
		tpl = el("div", {onclick: {"*": click1, "input": click1}}, [el("input")]);

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		reset();

		// no re-bind on redraw, even with handler & param changes
		tpl = el("div", {onclick: {"*": click2, "input": click2}}, [el("input")]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.clicks2, 2, "runs all matched delegs, not just first or most specific");
		assert.equal(counts.args2.length, 4);
		assert.ok(counts.args2[0] instanceof Event);
		assert.equal(counts.args2[1], vm.node.body[0]);
		assert.equal(counts.args2[2], vm);
		assert.equal(counts.args2[3], vm.data);

		reset();

		// remove
		tpl = el("div", [el("input")]);

		instr.start();
		vm.redraw();
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});

		reset();
	});

	QUnit.test("Fancy (parameterized & delegated)", function(assert) {
		tpl = el("div", {onclick: {"*": [click1, 1, 2], "input": [click2, 3, 4]}}, [el("input")]);

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();
		var expcHtml = '<div><input></div>';

		// TODO: test if "handle" is the thing that's bound
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2 });

		reset();

		doClick(vm.node.body[0].el);
		assert.equal(counts.clicks1, 1, "runs all matched delegs, not just first or most specific");
		assert.equal(counts.clicks2, 1, "runs all matched delegs, not just first or most specific");

		assert.equal(counts.args1.length, 6);
		assert.equal(counts.args1[0], 1);
		assert.equal(counts.args1[1], 2);
		assert.ok(counts.args1[2] instanceof Event);
		assert.equal(counts.args1[3], vm.node.body[0]);
		assert.equal(counts.args1[4], vm);
		assert.equal(counts.args1[5], vm.data);

		assert.equal(counts.args2.length, 6);
		assert.equal(counts.args2[0], 3);
		assert.equal(counts.args2[1], 4);
		assert.ok(counts.args2[2] instanceof Event);
		assert.equal(counts.args2[3], vm.node.body[0]);
		assert.equal(counts.args2[4], vm);
		assert.equal(counts.args2[5], vm.data);

		reset();
	});
*/
});