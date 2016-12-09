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
### Quick Example

Here's simple up/down incrementor.

**Try it:** https://jsfiddle.net/cdaLfztb/


```js
// Element VNode creator
var el = domvm.defineElement;

// view closure (called once during init)
function CounterView(vm) {
	// view's internal state
	var count = 0;

	// click handler
	function add(num) {
		count += num;
		vm.redraw();
	}

	// rendering function (called on each redraw)
	return function() {
		return el("#counter", [
			el("button", {onclick: [add, -1]}, "-"),
			el("strong", {style: "padding: 0 10px;"}, count),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

// create the ViewModel & append into document
var counterVm = domvm.createView(CounterView).mount(document.body);
```