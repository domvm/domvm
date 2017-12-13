QUnit.module("SVG", function() {
	var sv = domvm.defineSvgElement;

	QUnit.test('SVG elem: ["svg"]', function(assert) {
		var tpl = sv("svg", {width: "500", height: "150"}, [
			sv("ellipse", {cx: "240", cy: "100", rx: "220", ry: "30", style: "fill: purple;"}),
			"Sorry, your browser does not support inline SVG.",
		]);

		instr.start();
		var vm = domvm.createView(anonView(tpl)).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<svg width="500" height="150"><ellipse cx="240" cy="100" rx="220" ry="30" style="fill: purple;"/>Sorry, your browser does not support inline SVG.</svg>'.replace("/>", "></ellipse>");
		evalOut(assert, vm.node.el, vm.html().replace("/>", "></ellipse>"), expcHtml, callCounts, { createElementNS: 2, createTextNode: 1, cssText: 1, insertBefore: 3, setAttribute: 6 });
	});
});