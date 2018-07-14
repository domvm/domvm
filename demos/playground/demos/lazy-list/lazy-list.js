const el = (tag, arg1, arg2, flags) => domvm.defineElement(tag, arg1, arg2, domvm.FIXED_BODY);
const list = domvm.list;

function View(vm, store) {
	const key = item => item.id;
	const diff = item => [store.selected === item.id, item.text];

	return () => {
		return el("div", list(store.items, diff, key).map(item =>
			el("p", {class: store.selected === item.id ? 'selected' : null, _key: key(item)}, [		// items.key(item)
				el("em", item.text),
			])
		));
	}
}

var store = {
	selected: "b",
	items: [
		{id: "a", text: "A"},
		{id: "b", text: "B"},
		{id: "c", text: "C"},
	]
};

var vm = domvm.createView(View, store).mount(document.body);

setTimeout(function() {
	vm.redraw(true);
}, 1000);

setTimeout(function() {
	store.items = [];
	vm.redraw(true);
}, 2000);

setTimeout(function() {
	store.items = [
		{id: "a", text: "A"},
		{id: "b", text: "B"},
		{id: "c", text: "C"},
	];
	vm.redraw(true);
}, 3000);

setTimeout(function() {
	store.items[3] = {id: "x", text: "X"};
	vm.redraw(true);
}, 4000);

setTimeout(function() {
	store.items[1] = {id: "y", text: "Y"};
	vm.redraw(true);
}, 5000);

function View2(vm, store) {
	const diff = item => [store.selected === item.id, item.text];

	return () => {
		return el("div", list(store.items, diff).map(item =>
			el("p", {_data: item.id, class: store.selected === item.id ? 'selected' : null}, [
				el("em", item.text),
			])
		));
	}
}

var vm2 = domvm.createView(View2, store).mount(document.body);

setTimeout(function() {
	store.items[1] = {id: "y", text: "Y"};
	vm2.redraw(true);
}, 6000);