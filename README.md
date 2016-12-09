<img src="domvm.png" alt="domvm logo" style="max-width:100%;" align="right" height="60">

domvm (DOM ViewModel)
---------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Intro

domvm is a pure javascript, flexible view layer for your web applications - no more, no less.
You can write a working app in the next 3 minutes or learn its entire API in 1 hour.
It is tiny, fast, zero-dependency and tooling-free; just include and use.
It will not hold your hand, nor will it force your hand.

Don't let a view layer dictate your architecture; be the boss.

---

[Features](/dist/README.md)

[Demos](/demos)

[Benchmarks](/demos/bench)

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