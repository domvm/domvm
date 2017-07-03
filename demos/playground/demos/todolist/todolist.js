const el = domvm.defineElement;

function ListView(vm, items) {
	function toggleDone(i) {
		items[i].done = !items[i].done;
		vm.redraw();
	}

	function delItem(i) {
		items.splice(i, 1);
		vm.redraw();
	}

	function addItem() {
		var inp = vm.refs.newInp.el;

		if (inp.value !== "") {
			items.push({text: inp.value, done: false});
			inp.value = "";
			vm.redraw();
		}
	}

	function maybeAdd(e) {
		if (e.which === 13)
			addItem();
	}

	return () =>
		el("#todos", [
			el("h2", "TODO List"),
			el("input", {_ref: "newInp", onkeyup: maybeAdd}),
			el("button", {onclick: addItem}, "Add"),
			el(".totals", items.filter(item => item.done).length + " / " + items.length),
			items.map((item, i) =>
				el(".item", {class: item.done ? "done" : null}, [
					el("label", [
						el("input[type=checkbox]", {checked: item.done, onchange: [toggleDone, i]}),
						item.text,
					]),
					el("button", {onclick: [delItem, i]}, "X")
				])
			),
		])
};

const items = [
	{text: "Call pharmacy", done: false},
	{text: "Buy food", done: true},
	{text: "Appease cat", done: false},
	{text: "BASE Jump", done: false},
];

domvm.createView(ListView, items).mount(document.body);