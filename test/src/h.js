QUnit.module("Hyperscript");

var h  = domvm.h,
	cm = domvm.defineComment,
	tx = domvm.defineText;
//	es = defineElementSpread,
//	sv = defineSvgElement,

(function() {
	function ViewA() {
		var viewB = domvm.createView(ViewB, "hello");

		return function() {
			return h("#foo.bar.baz", [	// defineElement
				h(ViewB, "test"),		// defineView
				h("a", {href: "#"}, "x"),
				tx("moo"),				// defineText
				h(viewB),				// injectView
				"cow",					// plain value -> defineText
				cm("comment"),			// defineComment
				9,
			//	es("em", {class: "spr"}, es("i", "hey"), "xxx"),	// defineElementSpread
			]);
		};
	}

	function ViewB(vm, model) {
		return function() {
			return h("strong", model);
		};
	}

	QUnit.skip('Factory disambig', function(assert) {
		instr.start();
		var vm = domvm.createView(ViewA).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div id="foo" class="bar baz"><strong>test</strong><a href="#">x</a>moo<strong>hello</strong>cow<!--comment-->9</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 4, createTextNode: 3, createComment: 1, textContent: 3, id: 1, className: 1, setAttribute: 1, insertBefore: 8 });
	});
})();