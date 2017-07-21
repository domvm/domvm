var el = domvm.defineElement,
	vw = domvm.defineView;

var ENTER_KEY = 13,
	ESC_KEY = 27;

function TodoView(vm, app) {
	// shared view state -> sub-views
	var opts = {
		filter: "all"
	};

	// exposed api to toggle filters
	vm.api = {
		setFilter: function(filter) {
			opts.filter = filter;
			vm.redraw();
		}
	};

	return () =>
		el("section#todoapp", [
			vw(HeaderView, app, null, opts),
			app.items.length > 0 && vw(ListView, app, null, opts),
			app.items.length > 0 && vw(FooterView, app, null, opts),
		])
}

function HeaderView(vm, app) {
	function toggleAll(e, n) {
		app.setAll(n.el.checked);
	}

	function maybeAdd(e, n) {
		if (e.which === ENTER_KEY && n.el.value != "") {
			app.add(n.el.value);
			n.el.value = "";
		}
	}

	function preventSubmit(e) {
		return false;
	}

	return () =>
		el("header#header", [
			el("h1", "todos"),
			el("form#todo-form", {onsubmit: preventSubmit}, [
				app.items.length > 0 && el("input[type=checkbox]#toggle-all", {checked: !app.items.some(item => !item.done), onchange: toggleAll}),
				el("input#new-todo", {placeholder: "What needs to be done?", onkeyup: maybeAdd, _hooks: {didInsert: n => n.el.focus()}})
			])
		])
}

function ListView(vm, app, key, opts) {
	function filter(name) {
		return (
			name == "all" ? app.items :
			name == "active" ? app.items.filter(item => !item.done) :
			name == "completed" ? app.items.filter(item => item.done) :
			[]
		);
	}

	return () =>
		el("section#main", [
			el("ul#todo-list", filter(opts.filter).map(item =>
				vw(ItemView, item, item.key)
			))
		])
}

function ItemView(vm, item, key) {
	var editing = false;
	var editText = null;

	function toggle(e) {
		app.setOne(key, e.target.checked);
	}

	function remove() {
		app.remove(key);
	}

	function editStart() {
		editing = true;
		editText = item.text;
		vm.redraw();
	}

	function editCancel() {
		editing = false;
		vm.redraw();
	}

	function editInput(e) {
		if (e.which == ESC_KEY)
			editCancel();
		else if (e.which == ENTER_KEY)
			editCommit();
		else
			editText = e.target.value;
	}

	function editCommit() {
		if (editing) {
			editing = false;
			app.edit(key, editText);
		}
	}

	function itemClass() {
		var c = [];

		if (item.done)
			c.push("completed");
		if (editing)
			c.push("editing")

		return c.length > 0 ? c.join(" ") : null;
	}

	return () =>
		el("li", {class: itemClass()}, [
			el("input[type=checkbox].toggle", {checked: item.done, onchange: toggle}),
			!editing ?
				el("label", {ondblclick: editStart}, item.text) :
				el("input[type=text].edit", {
					_hooks: {didInsert: n => n.el.focus()},
					value: editText,
					onblur: editCommit,
					onkeyup: editInput,
				}),
			el("button.destroy", {onclick: remove})
		])
}

// TODO: set filters directly, rather than relying on routes
function FooterView(vm, app, key, opts) {
	function filtItem(name) {
		var upper = name[0].toUpperCase() + name.slice(1);

		return el("li", [
			el("a", {class: opts.filter == name ? "selected" : null, href: "#/"+name}, upper),
		]);
	}

	return () => {
		var notDone = app.items.filter(item => !item.done).length;

		return el("footer#footer", [
			el("span#todo-count", [
				el("strong", notDone),
				" item" + (notDone == 1 ? "" : "s") + " left"
			]),
			el("ul#filters", ["all","active","completed"].map(
				filtItem
			)),
			app.items.length > notDone && el("button#clear-completed", {onclick: app.clearDone}, "Clear completed")
		])
	}
}