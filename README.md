<img src="domvm.png" alt="domvm logo" style="max-width:100%;" align="right" height="60">

domvm (DOM ViewModel)
---------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Intro

domvm is a flexible, pure-js view layer for web apps.

- Its entire API can be learned in under 1 hour.
- It will happily fit into any existing codebase - whatever the structure.
- It's suitable for building complex applications or simple widgets.
- It's tiny, fast, zero-dependency and tooling-free; just include and use.

But beware, domvm will not hold your hand, nor will it force your hand.
It lets you - not the view layer - dictate your app architecture.

---

[Features](/dist/README.md), [Demos](/demos), [Benchmarks](/demos/bench)

---
### Simple Incrementor

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

### Want decoupled view & app code?

```js
var el = domvm.defineElement;

function CounterView(vm, counter) {
	function add(num) {
		counter.add(num);
		vm.redraw();
	}

	return function() {
		return el("#counter", [
			el("button", {onclick: [add, -1]}, "-"),
			el("strong", {style: "padding: 0 10px;"}, counter.count),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

function Counter() {
	this.count = 0;

	this.add = function(num) {
		this.count += num;
	};
}

var counter = new Counter();

var vm = domvm.createView(CounterView, counter).mount(document.body);
```

### Prefer view-aware models instead?

```js
var el = domvm.defineElement;

function CounterView(vm, counter) {
	var add = counter.add.bind(counter);

	return function() {
		return el("#counter", [
			el("button", {onclick: [add, -1]}, "-"),
			el("strong", {style: "padding: 0 10px;"}, counter.count),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

function Counter() {
	this.count = 0;

	this.add = function(num) {
		this.count += num;
		this.view.redraw();
	};

	this.view = domvm.createView(CounterView, this);
}

var counter = new Counter();

counter.view.mount(document.body);
```