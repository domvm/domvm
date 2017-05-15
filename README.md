<img src="domvm.png" alt="domvm logo" style="max-width:100%;" align="right" height="60">

domvm (DOM ViewModel)
---------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Intro

domvm is a flexible, pure-js view layer for your web apps.

- It's small: [~5k gz](/dist/README.md), fast: [just 10%](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts/table.html) slower vs ideal vanilla DOM code, zero-dependency and tooling-free.
- Its entire API can be mastered in under 1 hour by both, OO graybeards and FRP hipsters. Obvious, explicit behavior, debuggable plain JS templates, optional statefulness and interchangable imperative/declarative components.
- It'll happily fit into any existing codebase - whatever the structure.
- It's well-suited for building [simple widgets](https://rawgit.com/leeoniya/domvm/2.x-dev/demos/calendar.html) and [complex, fault-tolerant applications](http://rawgit.com/leeoniya/domvm/2.x-dev/demos/ThreaditJS/index.html).

But beware, domvm will not hold your hand nor will it force your hand; it lets you - not the view layer - dictate your app architecture.
It makes no attempt to cater to DOM or JavaScript novices; your ability to write your app in plain JS and raw DOM is assumed.

---

Learn either by browsing code: [Demos & Benchmarks](/demos) or reading the docs below.

---

### Documentation

- [What's Missing?](#whats-missing)
- [Builds](#builds)
- [Installation](#usage)
- [DEVMODE](#devmode)
- [Templates](#templates)
- [Views](#views)
- [DOM Recycling](#dom-recycling)
- [Sub-views vs Sub-templates](#sub-views-vs-sub-templates)
- [Events](#events)
- [Hello World++](#hello-world)
- [Parents & Roots](#parents--roots)
- [Autoredraw](#autoredraw)
- [DOM Refs](#dom-refs)
- [VNode Data](#vnode-data)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Isomorphism & SSR](#isomorphism-ssr)
- WIP!

<!--
third-party integration, element injection
vm.api
vm.diff / sCU
vnode.patch
vm.update()
streams
immutability
routing, ajax/fetch/xhr
internal emit
svg
es6 class views
fragments/component wrappers
-->

---
### What's Missing?

As a view layer, domvm does not include some things you would find in a larger framework.
This gives you the freedom to choose libs you already know or prefer for common tasks.
domvm provides a small, common surface for integration of routers, streams and immutable libs.
Some minimalist libs that work well:

- Routing: [domvm-router](https://github.com/leeoniya/domvm-router), [riot/route](https://github.com/riot/route), [rlite](https://github.com/chrisdavies/rlite), [navigo](https://github.com/krasimir/navigo)
- Ajax/fetch/XHR: [xr](https://github.com/radiosilence/xr), [alite](https://github.com/chrisdavies/alite)
- Streams: [flyd](https://github.com/paldepind/flyd), [xstream](https://github.com/staltz/xstream)
- Immutable Stores: [Freezer](https://github.com/arqex/freezer), [MobX](https://github.com/mobxjs/mobx)
- CSS-in-JS: [stylis.js](https://github.com/thysultan/stylis.js), [j2c](https://github.com/j2css/j2c), [oh boy...](https://github.com/MicheleBertoli/css-in-js)

Many [/demos](/demos) are examples of how to use these libs in your apps.

<!--
- Auto-redraw
- CSS-scoped views
-->

---
### Builds

domvm comes in [several builds](/dist) of increasing size and features. The `nano` build is a good starting point and is sufficient for most cases.

---
### Installation

**Browser**

```html
<script src="dist/nano/domvm.nano.min.js"></script>
```

**Node**

```js
var domvm = require("domvm");   // the "full" build
```

---
### DEVMODE

If you're new to domvm, the [dev build](/dist/dev/domvm.dev.js) is recommended for development & learning to avoid common mistakes; watch the console for warnings and advice.

There are a couple config options:

- `domvm.DEVMODE.enabled = false` will disable all warnings.
- `domvm.DEVMODE.verbose = false` will suppress the explanations, but still leave the error names & object info.
- `domvm.DEVMODE.UNKEYED_INPUT = false` will disable only these warnings. The full list can be found in [devmode.js](/src/view/addons/devmode.js).

Due to the runtime nature of DEVMODE heuristics, some warnings may be false positives (where the observed behavior is intentional). If you feel an error message can be improved, open an issue!

---
### Templates

Most of your domvm code will consist of templates for creating virtual-dom trees, which in turn are used to render and redraw the DOM.
domvm exposes several factory functions to get this done. Commonly this is called [hyperscript](https://github.com/hyperhype/hyperscript).

For convenience, we'll alias each factory function with a short variable:

```js
var el = domvm.defineElement,
    tx = domvm.defineText,
    cm = domvm.defineComment,
    sv = domvm.defineSvgElement,
    vw = domvm.defineView,
    iv = domvm.injectView,
    ie = domvm.injectElement;
```

<!-- TODO
domvm.defineElementSpread
Additionally, there's a convenience factory `domvm.h` that can discern `defineElement`, `defineView`, `injectView` and `injectElement` based on the provided arguments.
-->

Using `defineText` isn't strictly necessary since all encountered numbers and strings will be automatically converted into `defineText` vnodes for you.

Below is a dense reference of most template semantics. **Pay attention!**, there's a lot of neat stuff in here that won't be covered later!

```js
el("p", "Hello")                                            // plain tags
el("textarea[rows=10]#foo.bar.baz", "Hello")                // attr, id & class shorthands
el(".kitty", "Hello")                                       // "div" can be omitted from tags

el("input",  {type: "checkbox",    checked: true})          // boolean attrs
el("input",  {type: "checkbox", ".checked": true})          // set property instead of attr

el("button", {onclick: myFn}, "Hello")                      // event handlers
el("button", {onclick: [myFn, arg1, arg2]}, "Hello")        // parameterized
el("ul",     {onclick: {".item": myFn}}, ...)               // delegated
el("ul",     {onclick: {".item": [myFn, arg1, arg2]}}, ...) // delegated & parameterized

el("p",      {style: "font-size: 10pt;"}, "Hello")          // style can be a string
el("p",      {style: {fontSize: "10pt"}}, "Hello")          // or an object (camelCase only)
el("div",    {style: {width: 35}},        "Hello")          // "px" will be added when needed

el("h1", [                                                  // attrs object is optional
    el("em", "Important!"),
    "foo", 123,                                             // plain values
    ie(myElement),                                          // inject existing DOM nodes
    el("br"),                                               // void tags without content
    "", [], null, undefined, false,                         // these will be auto-removed
    NaN, true, {}, Infinity,                                // these will be coerced to strings
    [                                                       // nested arrays will get flattened
        el(".foo", {class: "bar"}, [                        // short & attr class get merged: .foo.bar
            "Baz",
            el("hr"),
        ])
    ],
])

el("#ui", [
    vw(NavBarView, navbar),                                 // sub-view w/model
    vw(PanelView, panel, "panelA"),                         // sub-view w/model & key
    iv(someOtherView),                                      // injected external ViewModel
])

// special _* props

el("p", {_raw: true}, "<span>A am text!</span>")            // raw innerHTML body, CAREFUL!
el("p", {_key: "myParag"}, "Some text")                     // keyed nodes
el("p", {_data: {foo: 123}}, "Some text")                   // per-node data (faster than attr)

el("p", {_ref: "myParag"}, "Some text")                     // named refs (vm.refs.myParag)
el("p", {_ref: "pets.james"}, "Some text")                  // namespaced (vm.refs.pets.james)
```

<!-- TODO
_flags:
namespaced/exposed refs
vw(fn, model, key, opts)
-->

---
### Views

What React calls "components", domvm calls "views".
A view definition is a named function which gives you an isolated working scope for any internal view state or helper functions.
This function must return a template-generating `render` function or an object containing the same:

<!--
However, domvm's views can be initialized both imperatively and declaratively prior to being composed within other views or being rendered to the DOM.
This opens the door to much more interesting architectural patterns when needed, without resorting to non-idiomatic framework hacks.
-->

```js
var el = domvm.defineElement;

function MyView() {                                         // named view closure
    return function() {                                         // render()
        return el("div", "Hello World!");                           // template
    };
}

function YourView() {
    return {
        render: function() {
            return el("div", "Hello World!");
        }
    };
}
```

Object-oriented folks may prefer ES6 class-based views. Simply include the ViewModel class wrapper.

```html
<script src="src/view/addons/ViewClass.js"></script>
```
```js
var el = domvm.defineElement;

class MyView extends View {
    constructor() {
        super();
        this.state = {i: 0};                                // this === vm
    }

    render() {
        return el("div", "Hello World! " + this.state.i);
    }
}

var vm = new MyView();

// or...

var vm = domvm.createView(MyView);
```

See [/demos/es6-class-views.html](/demos/es6-class-views.html) for more details.


Views can accept an external `model` to render (often referred to as `external state`, `data` or React's `props`):

```js
function MyView(vm, model, key, opts) {
    return function(vm, model, key, opts) {
        return el("div", "Hello " + model.firstName + "!");
    };
}
```

- `vm` is this views's `ViewModel`; it's the created instance of `MyView` and serves the same purpose as `this` within an ES6 React component. The `vm` provides the control surface/API to this view and can also expose a user-defined API for external view manipulation.
- `model` is the data passed in by a parent view.
- `key` may be defined by a parent view and is also copied down to this view's root VNode. Also see [DOM Recycling](#dom-recycling).
- `opts` can be used to pass in data that you may not want to put inside `model`. `opts.diff` and `opts.hooks` can be used to externally define lifecycle hooks and redraw optimizations.

Note the `render` function has the same signature as the view closure (more on "why" below).

<!--
Why does `render` have the same signature as the view closure?
In pure stateless views or ones with immutability, `render`'s arguments may change between redraws while the closure's arguments are fixated once at initialization.
If your view is stateful and permanently bound to a single model (more on this later), the closure's arguments can be used, otherwise they may become stale.
Which arguments are appropriate to use can be decided on a view-by-view basis and will depend on how the data/model is expected to flow into each view.
Relying on `render`'s args is similar to React's functional components, while using the closure's args is similar to using React's ES6 class components.
-->

Rendering a view to the DOM is called mounting. To mount a top-level view, we create it from a view definition:

```js
var model = {
    firstName: "Leon"
};

var vm = domvm.createView(MyView, model);

vm.mount(document.body);            // appends into target
```

By default, `.mount(container)` will append the view into the container. Alternatively, to replace an existing placeholder element:

```js
var placeholder = document.getElementById("widget");

vm.mount(placeholder, true);        // replaces placeholder
```

When a model mutates, you can request to redraw the view, optionally passing a boolean `sync` flag to force a synchronous redraw.

```js
vm.redraw(sync);
```

If you need to *replace* a view's model (as with immutable data structures), you can use `vm.update`, which will also redraw.
If replacing a model, make sure you do not internally use the `model` passed to the view closure, since this cannot be changed.
Instead, use the `model` argument provided to `render(vm, model, key)` or `vm.model` which will be replaced as needed.

```js
vm.update(newModel, sync);
```

Of course, you can nest views. This can be done either declaratively or via injection of any already-initialized view:

```js
function ViewA(vm, model) {
    return function() {
        return el("div", [
            el("strong", modelA.test),
            vw(ViewB, modelA.modelB),               // implicit/declarative view
            iv(model.viewC),                        // injected explicit view
        ]);
    };
}

function ViewB(vm, model) {
    return function() {
        return el("em", model.test2);
    };
}

function ViewC(vm, model) {
    return function() {
        return el("em", model.test3);
    };
}

var modelC = {
    test3: 789,
};

var modelA = {
    test: 123,
    modelB: {
        test2: 456,
    },
    viewC: domvm.createView(ViewC, modelC),
};

var vmA = domvm.createView(ViewA, modelA).mount(document.body);
```

---
### DOM Recycling

How models/states are passed into sub-views has implications for DOM recycling & view destruction:

- The signature for using sub-views within other templates is `domvm.defineView(viewFn, model, key, opts)`.
- If `key` is `null` or absent, domvm will default to using `model` as the key. Thus, `vw(View, model)` is implicitly `vw(View, model, model)`.
- Sub-views will persist & recycle their DOM only if their `key` is stable across redraws.

Depending on your background and app architecture (OO or FP), this implicit by-model view keying behavior can be the most surprising aspect of domvm. However, this allows users to avoid explicitly keying in architectures where models are persistent. For immutable stores where model identities change as a result of mutation, or when using ad-hoc model wrappers and deserializing JSON structures, you should take care to explicitly key any sub-views.

This example will destroy and recreate `SubView` [and its DOM] on every redraw of `View`:

```js
function View() {
    return function() {
        return el("#app", [
            vw(SubView, {foo: "bar"})        // ad-hoc model/state
        ]);
    };
}
```

To ensure `SubView` persistence and DOM recycling, you should use a stable model or provide an explicit, stable key.

```js
function View() {
    var model = {foo: "bar"};                // stable model identity

    return function() {
        return el("#app", [
            vw(SubView, model)
        ]);
    };
}

// OR

function View() {
    return function() {
        return el("#app", [
            vw(SubView, {foo: "bar"}, 123)   // explicit, stable key
        ]);
    };
}
```


---
### Sub-views vs Sub-templates

A core benefit of template composition is code reusability (DRY, component architecture). In domvm composition can be realized using either sub-views or sub-templates, often interchangeably. Sub-templates should generally be preferred over sub-views for the purposes of code reuse, keeping in mind that like sub-views, normal vnodes:

- Can be keyed to prevent undesirable DOM reuse
- Can subscribe to numerous lifecycle hooks
- Can hold data, which can then be accessed from event handlers

Sub-views carry a bit of performance overhead and should be used when the following are needed:

- Large building blocks
- Complex private state
- Numerous specific helper functions
- Isolated redraw (as a perf optimization)
- Synchronized redraw of disjoint views

As an example, the distinction can be discussed in terms of the [calendar demo](/demos/calendar.html). Its implementation is a single monolithic view with internal sub-template generating functions. Some may prefer to split up the months into a sub-view called MonthView, which would bring the total view count to 13. Others may be tempted to split each day into a DayView, but this would be a mistake as it would create 504 + 12 + 1 views, each incuring a slight performance hit for no reason.

The general advice is, restrict your views to complex, building-block-level, stateful components and use sub-template generators for readability and DRY purposes; a button should not be a view.


---
### Hello World++

**Try it:** https://jsfiddle.net/csLa6bew/

```js
var el = domvm.defineElement;                       // element VNode creator

function StepperView(vm, stepper) {                 // view closure (called once during init)
    function add(num) {
        stepper.value += num;
        vm.redraw();
    }

    function set(e) {
        stepper.value = +e.target.value;
    }

    return function() {                             // template renderer (called on each redraw)
        return el("#stepper", [
            el("button", {onclick: [add, -1]}, "-"),
            el("input[type=number]", {value: stepper.value, oninput: set}),
            el("button", {onclick: [add, +1]}, "+"),
        ]);
    };
}

var stepper = {                                     // some external model/data/state
    value: 1
};

var vm = domvm.createView(StepperView, stepper);    // create ViewModel, passing model

vm.mount(document.body);                            // mount into document
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

---
### Parents & Roots

You can access any view's parent view via `vm.parent()` and the great granddaddy of the view hierarchy via `vm.root()` shortcut.
So, logically, to redraw the entire UI tree from any subview, invoke `vm.root().redraw()`.


---
### Autoredraw

Is calling `vm.redraw()` everywhere a nuisance to you? Well, there is no autoredraw!

However, there *is* an easy way to add it yourself using `domvm.config.onevent` which, if present, will fire after any event handler.
You can get as creative as you want, including adding your own semantics to prevent redraw on a case-by-case basis by setting and checking for `e.redraw = false`.
Or maybe having a Promise piggyback on `e.redraw = new Promise(...)` that will resolve upon deep data being fetched.
You can maybe implement filtering by event type so that a flood of `mousemove` events, doesnt result in a redraw flood. Etc..

`onevent`'s arguments always represent the origin of the event in the vtree.

The [onevent demo](/demos/global-onevent.html) configs a basic full app autoredraw:

```js
domvm.config({
    onevent: function(e, node, vm, arg1, arg2) {
        rootVm.redraw();
    }
});
```

---
### Lifecycle Hooks

**Demo:** [lifecycle-hooks](https://rawgit.com/leeoniya/domvm/2.x-dev/demos/lifecycle-hooks.html) different hooks animate in/out with different colors.

**Node-level**

Usage: `el("div", {_hooks: {...}}, "Hello")`

- will/didInsert (initial insert)
- will/didRecycle (reuse & patch)
- will/didReinsert (detach & move)
- will/didRemove

Node-level `will*` hooks allow a promise/thennable return and can delay the event until the promise is resolved, allowing you to CSS animate, etc.

**View-level**

Usage: `vm.hook({willMount: ...})` or `return {render: ..., hooks: {willMount: ...}}`

- didInit (after view's closure/constructor)
- willUpdate (before views's model is replaced)
- will/didRedraw
- will/didMount (dom insertion)
- will/didUnmount (dom removal)

View-level `will*` hooks are not yet promise handling, so cannot be used for delay, but you can just rely on the view's root node's hooks to accomplish similar goals.