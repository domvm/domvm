domvm.config({
	onevent: function(e, node, vm, data, args) {
		VM.redraw();
	}
});

function randHex() {
	return "#"+((1<<24)*Math.random()|0).toString(16);
}

var el = domvm.defineElement;

function View() {
	function noop() {}

	return function() {
		return el("div", {style: "background: " + randHex() + "; width: 100px; height: 100px;", onmousemove: noop});
	}
}

var VM = domvm.createView(View).mount(document.body);