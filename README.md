<img src="domvm.png" alt="domvm logo" style="max-width:100%;" align="right" height="60">

domvm (DOM ViewModel)
---------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Philosophy

UI-centric, exclusively declarative components suffer from locked-in syndrome, making them unusable outside of a specific framework. Frequently they must extend framework classes and adhere to compositional restrictions which typically mimic the underlying DOM tree and sacrifice powerful exposed APIs for the sake of designer-centric ease and beauty.

Instead, domvm offers straightforward, pure-js development without opinionated structural or single-paradigm buy-in. Uniformly compose imperative and declarative views, expose APIs, hold private state or don't, dependency-inject or closure, build monolithic or loosely coupled components.

Architect reusable apps without fighting a pre-defined structure, learning tomes-worth of idiomatic abstractions or leaning on non-reusable, esoteric template DSLs.

---
### Looking for domvm v1?

It's still available in the [1.x-dev branch](https://github.com/leeoniya/domvm/tree/1.x-dev). This is v2 which is [up to 3.5x faster](https://github.com/leeoniya/domvm/issues/101#issuecomment-260141793), [smaller](https://github.com/leeoniya/domvm/blob/2.x-dev/dist/README.md) and more refined while keeping the core features and API which made v1 a pleasure to use. The first stable v2 will be ready in Jan 2017, but the view layer is already fully-featured and beta quality *today*; the router is being ported and refined from v1.


---
### Quick Examples

Simple up/down incrementor.

**Try it:** https://jsfiddle.net/n0dfxp4o/


```js
var el = domvm.defineElement;			// Element VNode creator

function CounterView(vm) {				// view closure (called once during init)
	var count = 0;

	function add(num) {					// click handler
		count += num;
		vm.redraw();
	}

	return function() {					// template renderer (called on each redraw)
		return el("#counter", [
			el("button", {onclick: [add, -1]}, "-"),
			el("strong", {style: "padding: 0 10px;"}, count),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

var vm = domvm.createView(CounterView);	// create ViewModel

vm.mount(document.body);				// mount into document
```

Sortable table with provided data.

**Try it:** https://jsfiddle.net/oaoz6f5t/

```js
var el = domvm.defineElement;

function ContactListView(vm, contacts) {
	var sortCol = null;
	var sortDesc = false;

	function sorter(a, b) {
		var x = sortDesc ? b : a,
			y = sortDesc ? a : b;

		return (""+x[sortCol]).localeCompare(""+y[sortCol]);
	}

	function colClick(colName) {
		if (colName == sortCol)
			sortDesc = !sortDesc;
		else {
			sortCol = colName;
			sortDesc = false;
		}

		contacts.sort(sorter);

		vm.redraw();
	}

	function colClass(_sortCol) {
		if (_sortCol == sortCol)
			return sortDesc ? "sortDesc" : "sortAsc";
	}

	return function() {
		return el("table#contacts", [
			el("tr", [
				el("th", {class: colClass("name"), onclick: [colClick, "name"]}, "Name"),
				el("th", {class: colClass( "age"), onclick: [colClick,  "age"]},  "Age"),
			]),
			contacts.map(function(cntc) {
				return el("tr", [
					el("td", cntc.name),
					el("td", cntc.age),
				]);
			})
		]);
	};
}

var contacts = [
	{name: "Bob",   age: 19},
	{name: "Alice", age: 42},
	{name: "Homer", age: 35},
];

domvm.createView(ContactListView, contacts).mount(document.body);
```