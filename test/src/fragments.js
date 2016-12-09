/*
TODO:
	- redraw
	- mutation (reorder, remove, insert)
	- validate hooks fire node-level frags and root-frag subviews
	- isomorphism/hydration
	- sigs: type/attrs/body (keyed/reorder)
	- textNode children (first/last)
	- optimize flatBody re-gen/reindex on subView redraw (fwd only)
	- isolate synchildren boundaries on frag subview redraw

	pull from /demos/fragments
*/

QUnit.module("Fragments");

(function() {
	var vm;

	function ViewWithFrags(vm) {
		return function() {
			return el("div", [
				fr([
					el("em", "foo"),
					el("strong", "bar"),
				])
			]);
		};
	}

	QUnit.test("Simple", function(assert) {
		instr.start();
		vm = domvm.createView(ViewWithFrags).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<div><em>foo</em><strong>bar</strong></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 3, createDocumentFragment: 1, insertBefore: 4, textContent: 2 });
	});

	function ViewWithAdjFrags(vm) {
		return function() {
			return el("div", [
				fr([
					el("em", "foo"),
					el("strong", "bar"),
				]),
				fr([
					el("span", "baz"),
					el("label", "cow"),
				])
			]);
		};
	}

	QUnit.test("Adjacent", function(assert) {
		instr.start();
		vm = domvm.createView(ViewWithAdjFrags).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<div><em>foo</em><strong>bar</strong><span>baz</span><label>cow</label></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 5, createDocumentFragment: 2, insertBefore: 7, textContent: 4 });
	});

	function ViewWithNestedAdjFrags(vm) {
		return function() {
			return el("div", [
				fr([
					fr([
						el("div", [
							fr([
								el(".a", "a"),
							])
						]),
						el(".b", "b"),
					]),
					el("em", "foo"),
					el("strong", "bar"),
				]),
				fr([
					el("span", "baz"),
					fr([
						el(".c", "c"),
						fr([
							el(".d", "d"),
							el(".e", "e"),
						]),
					]),
					el("label", "cow"),
				])
			]);
		};
	}

	QUnit.test("Nested & adjacent", function(assert) {
		instr.start();
		vm = domvm.createView(ViewWithNestedAdjFrags).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<div><div><div class="a">a</div></div><div class="b">b</div><em>foo</em><strong>bar</strong><span>baz</span><div class="c">c</div><div class="d">d</div><div class="e">e</div><label>cow</label></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 11, className: 5, createDocumentFragment: 6, insertBefore: 17, textContent: 9 });
	});


	function ViewFrag2(vm) {
		return function() {
			return fr([
				el("div", "j"),
				el("div", "k"),
			]);
		};
	}

	function ViewFrag(vm) {
		return function() {
			return fr([
				el("div", "h"),
				fr([
					vw(ViewFrag2),
				]),
				el("div", "i"),
			]);
		};
	}

	function ViewRoot(vm) {
		return function() {
			return el("div", [
				vw(ViewFrag),
				el("div", "x"),
				vw(ViewFrag),
				el("div", "y"),
			]);
		};
	}

	QUnit.test("Subviews w/ root frags", function(assert) {
		instr.start();
		vm = domvm.createView(ViewRoot).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<div><div>h</div><div>j</div><div>k</div><div>i</div><div>x</div><div>h</div><div>j</div><div>k</div><div>i</div><div>y</div></div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 11, createDocumentFragment: 6, insertBefore: 17, textContent: 10 });
	});
})();