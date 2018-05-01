QUnit.module("streams", function() {
	domvm.config({
		stream: {
			val: function(v, accum) {
				if (flyd.isStream(v)) {
					accum.push(v);
					return v();
				}
				else
					return v;
			},
			on: function(accum, vm) {
				let calls = 0;

				const s = flyd.combine(function() {
					if (++calls == 2) {
						vm.redraw();
						s.end(true);
					}
				}, accum);

				return s;
			},
			off: function(s) {
				s.end(true);
			}
		}
	});

	QUnit.test('render', function(assert) {
		function View() {
			return function() {
				return el("div", {style: {background: color}, foo: attr}, body);
			}
		}

		var color = flyd.stream("red");
		var attr = flyd.stream("bar");
		var body = flyd.stream("hello");
		var data = flyd.stream([]);
		var data2 = flyd.stream([]);

		instr.start();
		var vm = domvm.createView(View, data).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: red;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1, setAttribute: 1 });

		instr.start();
		color("blue");
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: blue;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		instr.start();
		data({});
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: blue;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		instr.start();
		vm.update(data2);
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: blue;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		instr.start();
		vm.update({});
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: blue;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		instr.start();
		vm.update(data);
		var callCounts = instr.end();

		var expcHtml = '<div foo="bar" style="background: blue;">hello</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		vm.unmount();
	});
});