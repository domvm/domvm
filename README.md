<h2><a href="https://github.com/leeoniya/domvm">domvm (DOM ViewModel)</a><img src="domvm.png" alt="domvm logo" height="64" align="right"></h2>

A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Intro

domvm is a flexible, pure-js view layer for building high performance web applications; it'll happily fit into any existing codebase, whatever the structure.
- It's zero-dependency, no-compilation & tooling-free; a single `<script>` tag and you're ready to go.
- It's small: [~5.5k gz](/dist/README.md), fast: [just 10%](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts/table.html) slower vs ideal vanilla DOM code. [20x faster SSR](/demos/bench/ssr) vs React.
- Its entire, practical API can be mastered in under 1 hour by both, OO graybeards and FRP hipsters. Obvious explicit behavior, debuggable plain JS templates, optional statefulness and interchangable imperative/declarative components.
- It's well-suited for building [simple widgets](http://leeoniya.github.io/domvm/demos/playground/#calendar) and [complex, fault-tolerant applications](http://leeoniya.github.io/domvm/demos/ThreaditJS).
- Supports down to IE9 with some tiny shims: [Promise](https://github.com/RubenVerborgh/promiscuous), [requestAnimationFrame](https://gist.github.com/paulirish/1579671), [matchesSelector](https://gist.github.com/elijahmanor/6452535).

To use domvm you should be comfortable with JavaScript and the DOM; the following code should be fairly self-explanatory:

```js
var el = domvm.defineElement;

var HelloView = {
    render: function(vm, data) {
        return el("h1", {style: "color: red;"}, "Hello " + data.name);
    }
};

domvm.createView(HelloView, {name: "Leon"}).mount(document.body);
```

---
### [Demo Playground](http://leeoniya.github.io/domvm/demos)

![demo playground](/playground.png)

---
### Documentation

- [What's Missing?](#whats-missing)
- [Builds](#builds)
- [Installation](#usage)
- [DEVMODE](#devmode)
- [Templates](#templates)
- [Views](#views)
- [Sub-views vs Sub-templates](#sub-views-vs-sub-templates)
- [Event Listeners](#event-listeners)
- [Autoredraw](#autoredraw)
- [Refs & Data](#refs--data)
- [Keys & DOM Recycling](#keys--dom-recycling)
- [Hello World++](#hello-world)
- [Parents & Roots](#parents--roots)
- [Emit System](#emit-system)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Isomorphism & SSR](#isomorphism--ssr)
- WIP: https://github.com/leeoniya/domvm/issues/156

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
- CSS-in-JS: [stylis.js](https://github.com/thysultan/stylis.js), [j2c](https://github.com/j2css/j2c), [emotion](https://github.com/tkh44/emotion), [oh boy...](https://github.com/MicheleBertoli/css-in-js)

Many [/demos](/demos) are examples of how to use these libs in your apps.

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

- `domvm.DEVMODE.mutations = false` will disable DOM mutation logging.
- `domvm.DEVMODE.warnings = false` will disable all warnings.
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
    ie = domvm.injectElement,
    // micro+ builds only:
    el2 = domvm.defineElementSpread,
    sv2 = domvm.defineSvgElementSpread;
```

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
    vw(NavBarView, navbar),                                 // sub-view w/data
    vw(PanelView, panel, "panelA"),                         // sub-view w/data & key
    iv(someOtherView),                                      // injected external ViewModel
])

// special _* props

el("p", {_raw: true}, "<span>A am text!</span>")            // raw innerHTML body, CAREFUL!
el("p", {_key: "myParag"}, "Some text")                     // keyed nodes
el("p", {_data: {foo: 123}}, "Some text")                   // per-node data (faster than attr)

el("p", {_ref: "myParag"}, "Some text")                     // named refs (vm.refs.myParag)
el("p", {_ref: "pets.james"}, "Some text")                  // namespaced (vm.refs.pets.james)

el("div", {_flags: ...}, "Some text")                       // optimization flags
```

---
### Views

What React calls "components", domvm calls "views".
A view definition can be a plain object or a named closure (for isolated working scope, internal view state or helper functions).
The closure must return a template-generating `render` function or an object containing the same:

<!--
However, domvm's views can be initialized both imperatively and declaratively prior to being composed within other views or being rendered to the DOM.
This opens the door to much more interesting architectural patterns when needed, without resorting to non-idiomatic framework hacks.
-->

```js
var el = domvm.defineElement;

function MyView(vm) {                                       // named view closure
    return function() {                                         // render()
        return el("div", "Hello World!");                           // template
    };
}

function YourView(vm) {
    return {
        render: function() {
            return el("div", "Hello World!");
        }
    };
}

var SomeView = {
    init: function(vm) {
        // ...
    },
    render: function() {
        return el("div", "Hello World!");
    }
};
```

Views can accept external `data` to render (à la React's `props`):

```js
function MyView(vm) {
    return function(vm, data) {
        return el("div", "Hello " + data.firstName + "!");
    };
}
```

`vm` is this views's `ViewModel`; it's the created instance of `MyView` and serves the same purpose as `this` within an ES6 React component.
The `vm` provides the control surface/API to this view and can expose a user-defined API for external view manipulation.

Rendering a view to the DOM is called mounting. To mount a top-level view, we create it from a view definition:

```js
var data = {
    firstName: "Leon"
};

var vm = domvm.createView(MyView, data);

vm.mount(document.body);            // appends into target
```

By default, `.mount(container)` will append the view into the container. Alternatively, to replace an existing placeholder element:

```js
var placeholder = document.getElementById("widget");

vm.mount(placeholder, true);        // replaces placeholder
```

When your data changes, you can request to redraw the view, optionally passing a boolean `sync` flag to force a synchronous redraw.

```js
vm.redraw(sync);
```

If you need to *replace* a view's data (as with immutable structures), you should use `vm.update`, which will also redraw.

```js
vm.update(newData, sync);
```

Of course, you can nest views. This can be done either declaratively or via injection of any already-initialized view:

```js
var el = domvm.defineElement,
    vw = domvm.defineView,
    iv = domvm.injectView;

function ViewA(vm) {
    return function(vm, dataA) {
        return el("div", [
            el("strong", dataA.test),
            vw(ViewB, dataA.dataB),               // implicit/declarative view
            iv(data.viewC),                         // injected explicit view
        ]);
    };
}

function ViewB(vm) {
    return function(vm, dataB) {
        return el("em", dataB.test2);
    };
}

function ViewC(vm) {
    return function(vm, dataC) {
        return el("em", dataC.test3);
    };
}

var dataC = {
    test3: 789,
};

var dataA = {
    test: 123,
    dataB: {
        test2: 456,
    },
    viewC: domvm.createView(ViewC, dataC),
};

var vmA = domvm.createView(ViewA, dataA).mount(document.body);
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

As an example, the distinction can be discussed in terms of the [calendar demo](http://leeoniya.github.io/domvm/demos/playground/#calendar). Its implementation is a single monolithic view with internal sub-template generating functions. Some may prefer to split up the months into a sub-view called MonthView, which would bring the total view count to 13. Others may be tempted to split each day into a DayView, but this would be a mistake as it would create 504 + 12 + 1 views, each incuring a slight performance hit for no reason.

The general advice is, restrict your views to complex, building-block-level, stateful components and use sub-template generators for readability and DRY purposes; a button should not be a view.

---
### Event Listeners

**Basic** listeners are defined by plain functions, and receive only the event as an argument (the same as vanilla DOM). If you need high performance such as `mousemove`, `drag`, `scroll` or other events, use basic listeners.

```js
function filter(e) {
    // ...
}

el("input", {oninput: filter});
```

**Fancy** listeners can do much more and are defined by a hash, an array or a hash of arrays. These listeners receive the following arguments: `(...args, e, node, vm, data)`.

Listeners defined by a hash are used for event delegation:

```js
function rowClick(e, node, vm, data) {}
function cellClick(e, node, vm, data) {}

el("table", {onclick: {"tr": rowClick, "td": cellClick}}, ...);
```

Arrays can be used to pass additional args to parameterized listeners:

```js
function cellClick(foo, bar, e, node, vm, data) {}

el("td", {onclick: [cellClick, "foo", "bar"]}, "moo");
```

Delegated and parameterized features can be combined:

```js
function cellClick(foo, bar, e, node, vm, data) {}

el("table", {onclick: {"td": [cellClick, "foo", "bar"]}}, ...);
```

View-level and global `onevent` listeners can be defined to handle **fancy** events:

```js
// global
domvm.config({
    onevent: function(e, node, vm, data, args) {
        // ...
    }
});

// vm-level
vm.config({
    onevent: function(e, node, vm, data, args) {
        // ...
    }
});
```

Notes:

- Listeners may return `false` as a shorthand for `e.preventDefault()` + `e.stopPropagation()`.
- Animation & transition listeners cannot be attached via `on*` props, such as `animationend`, `animationiteration`, `animationstart`, `transitionend`. To bind these events use a node-level `willInsert` [Lifecycle Hook](#lifecycle-hooks).
- `onevent`'s args always represent the origin of the event in the vtree

---
### Autoredraw

Is calling `vm.redraw()` everywhere a nuisance to you?

There's an easy way to implement autoredraw yourself via a global or vm-level `onevent` which fires after all **fancy** [event listeners](#event-listeners).
The [onevent demo](http://leeoniya.github.io/domvm/demos/playground/#onevent) demonstrates a basic full app autoredraw:

```js
domvm.config({
    onevent: function(e, node, vm, data, args) {
        vm.root().redraw();
    }
});
```

You can get as creative as you want, including adding your own semantics to prevent redraw on a case-by-case basis by setting and checking for `e.redraw = false`.
Or maybe having a Promise piggyback on `e.redraw = new Promise(...)` that will resolve upon deep data being fetched.
You can maybe implement filtering by event type so that a flood of `mousemove` events, doesnt result in a redraw flood. Etc..

---
### Refs & Data

Like React, it's possible to access the live DOM from event listeners, etc via `refs`. In addition, domvm's refs can be namespaced:

```js
function View(vm) {
    function sayPet(e) {
        var vnode = vm.refs.pets.fluffy;
        alert(fluffy.el.value);
    }

    return function() {
        return el("form", [
            el("button", {onclick: sayPet}, "Say Pet!"),
            el("input", {_ref: "pets.fluffy"}),
        ]);
    };
}
```

VNodes can hold arbitrary data, which obviates the need for slow `data-*` attributes and keeps your DOM clean:

```js
function View(vm) {
    function clickMe(e, node) {
        console.log(node.data);
    }

    return function() {
        return el("form", [
            el("button", {onclick: [clickMe], _data: {myVal: 123}}, "Click!"),
        ]);
    };
}
```

---
### Keys & DOM Recycling

Like React and good dom-reusing libs, domvm sometimes needs keys to assure you of deterministic DOM recycling - ensuring similar sibling DOM elements are not reused in unpredictable ways during mutation.
Unlike the others, keys in domvm are more flexible and often already implicit.

- Both vnodes and views may be keyed: `el('div', {_key: "a"})`, `vw(MyView, {...}, "a")`.
- Not all siblings need to be keyed - just those you need determinism for.
- Attrs and special attrs that should be unique anyhow will establish keys:
  - `_key` (explicit)
  - `_ref` (must be unique within a view)
  - `id` (should already be unique per document)
  - `name` or `name`+`value` for radios and checkboxes (should already be unique per form)

---
### Hello World++

**Try it:** http://leeoniya.github.io/domvm/demos/playground/#stepper1

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

**Try it:** http://leeoniya.github.io/domvm/demos/playground/#stepper2

```js
var el = domvm.defineElement;

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

function StepperView(vm, stepper) {
    function add(val) {
        stepper.add(val);
    }

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

var stepper = new Stepper();

stepper.view.mount(document.body);

// now let's use the stepper's API to increment
var i = 0;
var it = setInterval(function() {
    stepper.add(1);

    if (i++ == 20)
        clearInterval(it);
}, 250);
```

---
### Parents & Roots

You can access any view's parent view via `vm.parent()` and the great granddaddy of the view hierarchy via `vm.root()` shortcut.
So, logically, to redraw the entire UI tree from any subview, invoke `vm.root().redraw()`.

---

### Emit System

Emit is similar to DOM events, but works explicitly within the vdom tree and is user-triggerd.
Calling `vm.emit(evName, ...args)` on a view will trigger an event that bubbles up through the view hierarchy.
When an emit listener is matched, it is invoked and the bubbling stops.
Like fancy events, the `vm` and `data` args reflect the originating view of the event.

```js
// listen
vm.config({
    onemit: {
        myEvent: function(arg1, arg2, vm, data) {
            // ... do stuff
        }
    }
});

// trigger
vm.emit("myEvent", arg1, arg2);
```

There is also a global emit listener which fires for all emit events.

```js
domvm.config({
    onemit: {
        myEvent: function(arg1, arg2, vm, data) {
            // ... do stuff
        }
    }
});
```

---
### Lifecycle Hooks

**Demo:** [lifecycle-hooks](http://leeoniya.github.io/domvm/demos/playground/#lifecycle-hooks) different hooks animate in/out with different colors.

**Node-level**

Usage: `el("div", {_key: "...", _hooks: {...}}, "Hello")`

- will/didInsert (initial insert)
- will/didRecycle (reuse & patch)
- will/didReinsert (detach & move)
- will/didRemove

While not required, it is strongly advised that your hook-handling vnodes are [uniquely keyed](#keys--dom-recycling) as shown above, to ensure deterministic DOM recycling and hook invocation.

**View-level**

Usage: `vm.config({hooks: {willMount: ...}})` or `return {render: ..., hooks: {willMount: ...}}`

- willUpdate (before views's data is replaced)
- will/didRedraw
- will/didMount (dom insertion)
- will/didUnmount (dom removal)

`did*` hooks fire after a forced DOM repaint. `willRemove` & `willUnmount` hooks can return a Promise to delay the removal/unmounting allowing you to CSS transition, etc.

---
### Isomorphism & SSR

Like React's `renderToString`, domvm can generate html and then hydrate it on the client.
In `server` & `full` builds, `vm.html()` can generate html.
In `client` & `full` builds, `vm.attach(target)` should be used to hydrate the rendered DOM.

```js
var el = domvm.defineElement;

function View() {
    function sayHi(e) {
        alert("Hi!");
    }

    return function(vm, data) {
        return el("body", {onclick: sayHi}, "Hello " + data.name);
    }
}

var data = {name: "Leon"};

// return this generated <body>Hello Leon</body> from the server
var html = domvm.createView(View, data).html();

// then hydrate on the client to bind event handlers, etc.
var vm = domvm.createView(View, data).attach(document.body);
```