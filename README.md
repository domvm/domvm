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
### A Simple Stepper

**Try it:** https://jsfiddle.net/csLa6bew/

```js
var el = domvm.defineElement;						// Element VNode creator

function StepperView(vm, stepper) {					// view closure (called once during init)
	function add(num) {
		stepper.value += num;
		vm.redraw();
	}

	function set(e) {
		stepper.value = +e.target.value;
	}

	return function() {								// template renderer (called on each redraw)
		return el("#stepper", [
			el("button", {onclick: [add, -1]}, "-"),
			el("input[type=number]", {value: stepper.value, oninput: set}),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

var stepper = {										// some external model/data/state
	value: 1
};

var vm = domvm.createView(StepperView, stepper);	// create ViewModel, passing model

vm.mount(document.body);							// mount into document
```

The above example is simple and decoupled. It provides a UI to modify our stepper object which itself needs no awareness of any visual representation.
But what if we want to modify the stepper using an API and still have the UI reflect these changes. For this we need to add some coupling.
One way to accomplish this is to beef up our stepper with an API and give it awareness of its view(s) which it will redraw.
The end result is a lightly-coupled domain model that:

1. Holds state, as needed.
2. Exposes an API that can be used programmatically and is UI-consistent.
3. Exposes view(s) which utilize the API and can be composed within other views.

It is *this* fully capable, view-augmented domain model that domvm's author considers a truely reusable "component".

**Try it:** https://jsfiddle.net/qgyu1g36/

```js
var el = domvm.defineElement;

function StepperView(vm, stepper) {
	var add = stepper.add.bind(stepper);

	function set(e) {
		stepper.set(e.target.value);
	}

	return function() {
		return el("#stepper", [
			el("button", {onclick: [add, -1]}, "-"),
			el("input[type=number]", {value: stepper.value, oninput: set}),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

function Stepper() {
	this.value = 1;

	this.add = function(num) {
		this.value += num;
		this.view.redraw();
	};

	this.set = function(num) {
		this.value = +num;
		this.view.redraw();
	};

	this.view = domvm.createView(StepperView, this);
}

var stepper = new Stepper();

stepper.view.mount(document.body);

// now let's use the stepper's API to increment
var i = 0;
var it = setInterval(function() {
	stepper.add(1);

	if (i++ == 20) clearInterval(it);
}, 250);
```