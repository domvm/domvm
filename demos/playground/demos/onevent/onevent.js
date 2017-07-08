var el = domvm.defineElement;

function randHex() {
	return "#"+((1<<24)*Math.random()|0).toString(16);
}

function View() {
	function noop() {}

	return function() {
		return el("div", {
			style: {
				width: 100,
				height: 100,
				background: randHex(),
			},
			onmouseenter: noop,
			onmouseleave: noop,
		});
	}
}

domvm.createView(View).mount(document.body);

domvm.config({
	onevent: function(e, node, vm, data, args) {
		vm.root().redraw();
	}
});