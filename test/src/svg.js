/*
QUnit.module("SVG");

(function() {
	QUnit.skip('SVG elem: ["svg"]', function(assert) {
		var tpl = el("svg");

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<svg></svg>';		// should include xlink & xmlns?
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElementNS: 1, insertBefore: 1 });
	});
})();
*/