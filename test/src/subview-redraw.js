QUnit.module("Subview redraw(true) Branch Consistency");

(function() {
	function Parent() {
		this.kids = [];

		this.view = vw(ParentView, this, this);
	}

	function ParentView(vm) {
		var parent = vm.data;

		parent.vm = vm;

		return function() {
			return el("ul", parent.kids.map(function(kid) {
				return kid.view;
			}));
		};
	}

	function Child(name) {
		this.name = name;

		this.view = vw(ChildView, this, this);
	}

	function ChildView(vm) {
		var child = vm.data;

		child.vm = vm;

		return function() {
			return el("li", child.name);
		};
	}

	var mom = new Parent();
	mom.kids.push(new Child("Billy"));

	var vm, vm2;
//	var vm2 =	// how to get .html?

	QUnit.test('Proper initial HTML', function(assert) {
		var expcHtml = '<ul><li>Billy</li></ul>';

		instr.start();
		vm = domvm.createView(mom.view).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 2, insertBefore: 2, textContent: 1 });
	});

	QUnit.test('update child -> redraw child -> redraw parent', function(assert) {
		mom.kids[0].name = "Johnny";

		instr.start();
		mom.kids[0].vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Johnny</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	QUnit.test('update child -> redraw parent -> redraw child', function(assert) {
		mom.kids[0].name = "Chuck Norris";

		instr.start();
		mom.vm.redraw(true);
		var callCounts = instr.end();

		var expcHtml = '<ul><li>Chuck Norris</li></ul>';

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { nodeValue: 1 });

		instr.start();
		mom.kids[0].vm.redraw(true);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, {});
	});

	// TODO: also with passed-in data
})();