QUnit.module("Events");

(function() {
	function doClick(targ) {
		targ.dispatchEvent(new MouseEvent('click', {
			view: window,
			bubbles: true,
			cancelable: true
		}));
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

	var onclick = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "onclick");

	Object.defineProperty(HTMLElement.prototype, "onclick", {
		set: function(s) {
			if (s == null || s == "")
				counts.unset++;
			else
				counts.set++;

			onclick.set.call(this, s);
		},
	});

	domvm.config({
		onevent: function(e, node, vm, data, args) {
			counts.globalOnArgs = Array.prototype.slice.call(arguments);
		}
	});

	function View(vm) {
		vm.config({
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
		vm = domvm.createView(View).mount(testyDiv);

		// initial bind
		assert.equal(vm.node.body[0].el.onclick, click1);
		assert.equal(counts.set, 1);
		assert.equal(counts.unset, 0);

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args1.length, 1);
		assert.ok(counts.args1[0] instanceof MouseEvent);

		reset();

		// no re-bind on redraw
		tpl = el("div", [el("input", {onclick: click1})]);
		vm.redraw(true);
		assert.equal(vm.node.body[0].el.onclick, click1);
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 0);

		reset();

		// mutate
		tpl = el("div", [el("input", {onclick: click2})]);
		vm.redraw(true);
		assert.equal(vm.node.body[0].el.onclick, click2);
		assert.equal(counts.set, 1);
		assert.equal(counts.unset, 0);

		// return false -> preventDefault + stopPropagation
		// todo: spy on Event.prototype.stopPropagation
		doClick(vm.node.body[0].el);
		assert.equal(counts.args2[0].defaultPrevented, true);

		reset();

		// remove
		tpl = el("div", [el("input", {onclick: null})]);
		vm.redraw(true);
		assert.equal(vm.node.body[0].el.onclick, null);
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 1);

		reset();
	});

	QUnit.test("Fancy (parameterized)", function(assert) {
		tpl = el("div", [el("input", {onclick: [click1, 1, 2]})]);
		vm = domvm.createView(View).mount(testyDiv);

		// initial bind
		assert.equal(vm.node.body[0].el.onclick.name, 'handle');
		assert.equal(counts.set, 1);
		assert.equal(counts.unset, 0);

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args1.length, 6);
		assert.equal(counts.args1[0], 1);
		assert.equal(counts.args1[1], 2);
		assert.ok(counts.args1[2] instanceof MouseEvent);
		assert.equal(counts.args1[3], vm.node.body[0]);
		assert.equal(counts.args1[4], vm);
		assert.equal(counts.args1[5], vm.data);

		// global & vm-level onevent args
		assert.ok(counts.globalOnArgs[0] instanceof MouseEvent);
		assert.equal(counts.globalOnArgs[1], vm.node.body[0]);
		assert.equal(counts.globalOnArgs[2], vm);
		assert.equal(counts.globalOnArgs[3], vm.data);
		assert.deepEqual(counts.globalOnArgs[4], [1,2]);

		assert.ok(counts.vmOnArgs[0] instanceof MouseEvent);
		assert.equal(counts.vmOnArgs[1], vm.node.body[0]);
		assert.equal(counts.vmOnArgs[2], vm);
		assert.equal(counts.vmOnArgs[3], vm.data);
		assert.deepEqual(counts.vmOnArgs[4], [1,2]);

		reset();

		// no re-bind on redraw, even with handler & param changes
		tpl = el("div", [el("input", {onclick: [click2, 3, 4]})]);
		vm.redraw(true);
		assert.equal(vm.node.body[0].el.onclick.name, 'handle');
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 0);

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.args2.length, 6);
		assert.equal(counts.args2[0], 3);
		assert.equal(counts.args2[1], 4);
		assert.ok(counts.args2[2] instanceof MouseEvent);
		assert.equal(counts.args2[3], vm.node.body[0]);
		assert.equal(counts.args2[4], vm);
		assert.equal(counts.args2[5], vm.data);

		reset();

		// TODO? test mutating basic <-> fancy handlers: [click1] <-> click2

		// remove
		tpl = el("div", [el("input", {onclick: null})]);
		vm.redraw(true);
		assert.equal(vm.node.body[0].el.onclick, null);
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 1);

		reset();
	});

	QUnit.test("Fancy (delegated)", function(assert) {
		tpl = el("div", {onclick: {"*": click1, "input": click1}}, [el("input")]);
		vm = domvm.createView(View).mount(testyDiv);

		// initial bind
		assert.equal(vm.node.el.onclick.name, 'handle');
		assert.equal(counts.set, 1);
		assert.equal(counts.unset, 0);

		reset();

		// no re-bind on redraw, even with handler & param changes
		tpl = el("div", {onclick: {"*": click2, "input": click2}}, [el("input")]);
		vm.redraw(true);
		assert.equal(vm.node.el.onclick.name, 'handle');
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 0);

		// clicked args
		doClick(vm.node.body[0].el);
		assert.equal(counts.clicks2, 2, "runs all matched delegs, not just first or most specific");
		assert.equal(counts.args2.length, 4);
		assert.ok(counts.args2[0] instanceof MouseEvent);
		assert.equal(counts.args2[1], vm.node.body[0]);
		assert.equal(counts.args2[2], vm);
		assert.equal(counts.args2[3], vm.data);

		reset();

		// remove
		tpl = el("div", [el("input")]);
		vm.redraw(true);
		assert.equal(vm.node.el.onclick, null);
		assert.equal(counts.set, 0);
		assert.equal(counts.unset, 1);

		reset();
	});

	QUnit.test("Fancy (parameterized & delegated)", function(assert) {
		tpl = el("div", {onclick: {"*": [click1, 1, 2], "input": [click2, 3, 4]}}, [el("input")]);
		vm = domvm.createView(View).mount(testyDiv);

		// initial bind
		assert.equal(vm.node.el.onclick.name, 'handle');
		assert.equal(counts.set, 1);
		assert.equal(counts.unset, 0);

		reset();

		doClick(vm.node.body[0].el);
		assert.equal(counts.clicks1, 1, "runs all matched delegs, not just first or most specific");
		assert.equal(counts.clicks2, 1, "runs all matched delegs, not just first or most specific");

		assert.equal(counts.args1.length, 6);
		assert.equal(counts.args1[0], 1);
		assert.equal(counts.args1[1], 2);
		assert.ok(counts.args1[2] instanceof MouseEvent);
		assert.equal(counts.args1[3], vm.node.body[0]);
		assert.equal(counts.args1[4], vm);
		assert.equal(counts.args1[5], vm.data);

		assert.equal(counts.args2.length, 6);
		assert.equal(counts.args2[0], 3);
		assert.equal(counts.args2[1], 4);
		assert.ok(counts.args2[2] instanceof MouseEvent);
		assert.equal(counts.args2[3], vm.node.body[0]);
		assert.equal(counts.args2[4], vm);
		assert.equal(counts.args2[5], vm.data);

		reset();
	});

//	Object.defineProperty(HTMLElement.prototype, "onclick", onclick);
})();