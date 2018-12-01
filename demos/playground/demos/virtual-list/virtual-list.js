// a straightforward port of https://github.com/developit/preact-virtual-list

var el = domvm.defineElement;
var vw = domvm.defineView;

const STYLE_INNER = 'position:relative; overflow:hidden; width:100%; min-height:100%;';

const STYLE_CONTENT = 'position:absolute; top:0; left:0; height:100%; width:100%; overflow:visible;';

function VirtualList(vm) {
	var height = 0;
	var offset = 0;

	function resize() {
		if (height !== vm.node.el.offsetHeight) {
			height = vm.node.el.offsetHeight;
			vm.redraw();
		}
	}

	function handleScroll() {
		offset = vm.node.el.scrollTop;
		vm.redraw();
	}

	vm.cfg({
		hooks: {
			didRedraw: resize,
			didMount: function() {
				resize();
				addEventListener('resize', resize);
			},
			willUnmount: function() {
				removeEventListener('resize', resize);
			},
		//	didUpdate function() {
		//		resize();
		//	},
		}
	});

	return function(vm, props) {
		var data = props.data;
		var rowHeight = props.rowHeight;
		var renderRow = props.renderRow;
		var overscanCount = props.overscanCount || 10;
		var sync = props.sync || true;

		// first visible row index
		let start = (offset / rowHeight)|0;

		// actual number of visible rows (without overscan)
		let visibleRowCount = (height / rowHeight)|0;

		// Overscan: render blocks of rows modulo an overscan row count
		// This dramatically reduces DOM writes during scrolling
		if (overscanCount) {
			start = Math.max(0, start - (start % overscanCount));
			visibleRowCount += overscanCount;
		}

		// last visible + overscan row index
		let end = start + 1 + visibleRowCount;

		// data slice currently in viewport plus overscan items
		let selection = data.slice(start, end);

		return (
			el("div", {class: props.class, onscroll: handleScroll}, [	// ...props
				el("div", {style: STYLE_INNER + "height:" + data.length*rowHeight + "px"}, [
					el("div", {style: STYLE_CONTENT + "top:" + start*rowHeight + "px"}, selection.map(
						renderRow
					))
				])
			])
		);
	}
}

// static data
const DATA = [];
for (let x=1e5; x--; )
	DATA[x] = `Item #${x+1}`;

domvm.createView(VirtualList, {
	data: DATA,
	rowHeight: 30,
	class: "list",
	renderRow: function(row) {
		return el(".row", row);
	},
}).mount(document.body);