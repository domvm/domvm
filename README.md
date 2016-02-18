domvm.js (DOM ViewModel)
------------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
#### Philosophy

UI-centric, exclusively declarative components suffer from locked-in syndrome, making them unusable outside of a specific framework. Frequently they must extend framework classes and adhere to compositional restrictions which typically mimic the underlying DOM tree and sacrifice powerful exposed APIs for the sake of designer-centric ease and beauty.

Components should instead be plain, stateful and reusable JS objects with APIs or domain models with methods. They in turn can expose one or multiple views for external composition - each with its own state and/or exposed view API (e.g. `emailApp.tableView.markUnread()`). Alternatively, component views can be crafted externally and composed declaratively or imperatively interacted with. domvm provides this flexibility, allowing for separation of concerns and truly reusable components without framework lock-in.

---
#### Features

- Thin API, no dependencies, build = just concat & min
- Small - ~8k min core + ~4k router, isomorphism, observers (~5k everything gzipped)
- Ultra fast - [dbmonster](http://leeoniya.github.io/domvm/test/bench/dbmonster/), [granular patch](http://leeoniya.github.io/domvm/test/bench/patch/)
- Concise js templates. No html-in-js, js-in-html or other esoteric syntax requiring tooling/compilation
- Sub-views - declarative OR imperative, freely composable, stateful and independently refreshable
- Isomorphic - generate markup server-side and attach on client
- Decoupled client-side router (for SPAs) & mutation observers (for auto-redraw)
- Emit custom events to parent views (bubbling)
- SVG & MathML support: [demo](http://leeoniya.github.io/domvm/demos/svg_mathml.html), [svg tiger](http://leeoniya.github.io/domvm/demos/svg-tiger.html),
- IE9+ (w/ some small ES5 polyfills)

---
#### Usage/API

0. [Installation](#installation)
0. [Modules](#modules)
0. [Template Reference](#template-reference)
0. [Create, Modify, Redraw](#create-modify-redraw)
0. [Subviews, Components](#subviews-components)
0. [DOM Refs, after()](#dom-refs-after)
0. [Events, emit(), on:{}](#events-emit-on)
0. [Isomorphism, html(), attach()](#isomorphism-html-attach)
0. [Granular patch()](#granular-patch)
0. More docs to come...

---
#### Installation

**Browser**

```html
<script src="domvm.min.js"></script>
```

**Node (TODO)**

```js
var domvm = require("domvm");
```

---
#### Modules

Each module is a single js file in `/src`. The first 3 are the "core", the rest are optional and can be replaced by your own implementations. For development, just include them in order.

- domvm: namespace & module wrapper
- domvm.util: generic funcs required by other modules
- domvm.view: the core view/vdom/template lib
- domvm.html: vtree => innerHTML generator, if you need isomorphism/SSR
- domvm.watch: auto-redraw helpers - mutation observers, ajax wrappers
- domvm.route: router & reverse router for single page apps (SPAs)

**Building A Custom Bundle**

Building is simple: concat the needed modules and minify with tools of your choice. I use [Closure Compiler](https://developers.google.com/closure/compiler/docs/gettingstarted_app) for both:

```
java -jar compiler.jar
	--language_in ECMASCRIPT5
	--js src/domvm.js
	--js src/util.js
	--js src/view.js
	--js src/html.js
	--js src/watch.js
	--js src/route.js
	--js_output_file dist/domvm.min.js
```

---
#### Template Reference

domvm templates are a superset of [JSONML](http://www.jsonml.org/)

```js
["p", "Hello"]												// plain tags
["p#foo.bar.baz", "Hello"]									// id and class shorthands
["input", {type: "checkbox", checked: true}]				// boolean attrs
["input", {type: "checkbox", ".checked": true}]				// set property instead of attr
["button", {onclick: function(e) {...}}, "Hello"]			// event handlers
["ul", {onclick: {".item": function(e) {...}}}, "Hello"]	// event handlers (delegated)
["p", {style: "font-size: 10pt;"}, "Hello"]					// style can be a string
["p", {style: {fontSize: "10pt"}}, "Hello"]					// or an object (camelCase only)
["div", {style: {width: 35}}, "Hello"]						// "px" will be added when needed

["h1", {class: "header"},									// (props object is optional)
	["em", "Important!"],									// child nodes follow tag
	"foo",													// and can be text nodes
	function() { return ["div", "clown"]; },				// or getters returning a child
]

["h1", [													// explicit child array can be provided
	["em", "Important!"],									// (but first child cannot be a getter
	["sub", "tiny"],										// or text/number...cause ambiguous)
	[														// any sub-arrays will get flattened
		["strong", "stuff"],								// but are subject to same conditions
		["em", "more stuff"],
	],
]]

["p", function() {											// getter can return child array
	return [
		["span", "foo"],
		["em", "bar"],
	];
}]

["textarea", {rows: 50}].concat([							// use concat() to avoid explicit
	"text",													// child array restrictions
	["br"],
	"", null, undefined, [],								// these will be removed
	NaN, true, false, {}, Infinity							// these will be coerced to strings
])

["#ui",														// same as "div#ui"
	[SomeViewFn],											// sub-view w/closured data
	[NavBarView, navbar],									// sub-view w/model
	[PanelView, panel, "panelA"],							// sub-view w/model & key
	preInitVm,												// pre-initialized ViewModel
]


// some special props...

[".myHtml", {_raw: true}, "<p>A am text!</p>"]				// raw innerHTML body

["p", {_key: "myParag"}, "Some text"]						// keyed elements

["p", {_ref: "myParag"}, "Some text"]						// named refs (via vm.refs.myParag)

["div", {_guard: true}]										// guarded/unmanaged node (TODO)
```

---
#### Create, Modify, Redraw

```js
// our model (just some data)
var myPeeps = [
	{name: "Peter", age: 31},
	{name: "Morgan", age: 27},
	{name: "Mark", age: 70},
];

// our view (will receive model)
function PeopleView(vm, people) {
	return function() {
		return ["ul.people-list", people.map(function(person) {
			return ["li", person.name + " (aged " + person.age + ")"];
		})];
	};
}

// create view model
var vm = domvm.view(PeopleView, myPeeps);

// render to document
vm.mount(document.body);

// modify the list
myPeeps.shift();
myPeeps.push(
	{name: "Allison", age: 15},
	{name: "Sergey", age: 39}
);

// redraw view model
vm.redraw();
```

You can store any needed view state inside the `PeopleView` closure.

---
#### Subviews, Components

Let's split the above example into nested sub-views.

```js
// models
function People(list) {
	this.list = list;

	this.view = [PeopleView, this];
}

function Person(name, age) {
	this.name = name;
	this.age = age;

	this.view = [PersonView, this];
}

// views
function PeopleView(vm, people) {
	// expose the view model to have vm.redraw() control outside this closure
	people.vm = vm;

	return function() {
		return ["ul.people-list", people.map(function(person) {
			return person.view;
		})];
	};
}

function PersonView(vm, person) {
	person.vm = vm;

	return function() {
		return ["li", person.name + " (aged " + person.age + ")"];
	};
}

var myPeeps = [
	new Person("Peter", 31),
	new Person("Morgan", 27),
	new Person("Mark", 70),
];

var people = new People(myPeeps);

domvm.view(people.view).mount(document.body);

// modify the list
var allison = new Person("Allison", 15);
var sergy = new Person("Sergey", 39);

people.list.push(allison, sergy);

// redraw list
people.vm.redraw();

// modify a specific person
allison.age = 100;

// redraw person (sub-view)
allison.vm.redraw();
```

1. The only addition to your domain models is a one-liner view definition, resulting in loose coupling. There is no restriction to have only a single view, you can have multiple views of the same model.
2. The view functions expose the view model to the model itself via `model.vm = vm` from within the view closure. This allows you invoke `redraw()` of sub-views (and access other features) through your model instances.

There are many ways to skin a cat; you can define the views/model coupling outside the models entirely if you prefer. Instead, the above can re-written as:

```js
// models
function People(list) {
	this.list = list;
}

function Person(name, age) {
	this.name = name;
	this.age = age;
}

// views
function PeopleView(vm, people) {
	people.vm = vm;

	return function() {
		return ["ul.people-list", people.map(function(person) {
			return [PersonView, person];							// view/model coupling now defined in parent template
		})];
	};
}

function PersonView(vm, person) {
	person.vm = vm;

	return function() {
		return ["li", person.name + " (aged " + person.age + ")"];
	};
}

var myPeeps = [
	new Person("Peter", 31),
	new Person("Morgan", 27),
	new Person("Mark", 70),
];

var people = new People(myPeeps);

domvm.view(PeopleView, people).mount(document.body);							// top-level view/model coupling now defined here
```

---
#### DOM Refs, didRedraw()

Get references to created DOM nodes.

```js
function SomeView(vm) {
	vm.on({
		didRedraw: function() {
			// this is called after every redraw/render and can be used to operate on the created DOM elements
			console.log("created link element", vm.refs.myLink)
		}
	});

	return function() {
		return ["a", {href: "#", _ref: "myLink"}, "some link"];
	}
}
```

---
#### Events, emit(), on()

Custom events can be triggered, bubbled and listened to in the view hierarchy, similar to DOM events.

```js
function ParentView(vm) {
	vm.on({
		myEvent: function(arg1, arg2) {
			console.log("caught myEvent", arguments);
		}
	});

	return function() {
		return ["div", [ChildView]];
	};
}

function ChildView(vm) {
	return function() {
		return ["em", {onclick: function(e) { vm.emit("myEvent", ["arg1", "arg2"]); }}, "some text"];
	};
}
```

1. Events normally bubble up the view tree and trigger all listeners that match the event name. But they can be targeted to specific ancestors (currently only by numeric level, but soon and more usefully by `_key`). To target an event only to the parent, use `vm.emit("myEvent:1")`. To target it only at the root view, just pick any large number: `vm.emit("myEvent:1000")`.
2. Since triggering an ancestor's `redraw()` from a child is such a common requirement, each view model is preloaded with a "_redraw" event listener in the emit system. You can trigger an ancestor's `redraw()` (e.g. root) from a child via `vm.emit("_redraw:1000")`. There is a shorthand for this case `vm.emit.redraw(targ)` where `targ` defaults to `1000` (root).
3. Event listeners that return `false` will stop further bubbling.

---
#### Isomorphism, html(), attach()

```js

function SomeView(vm) {
	return function() {
		return ["div#foo", "foobar"];
	};
}

// on the backend
var vm = domvm.view(SomeView, someModel);
// have server barf this html into the returned document
var html = domvm.html(vm.node);

// ...then on the front-end
var vm = domvm.view(SomeView, someModel);
// instead of mount(), use attach()
vm.attach(document.getElementById("foo"));
```

---

#### Finding nodes, up(), down()

Nodes can be queried by its key.
```js
function List(vm) {
    return function() {
        return ["ul", {_key: "list"},
            ["li", {_key: "item-a"}, "TextA"],
            ["li", {_key: "item-b"}, "TextB"],
            ["li", {_key: "item-c"}, "TextC"]
        ];
    };
}
var vm = domvm.view(List);
vm.mount(document.body);

// Find a child down in the tree
var itemA = vm.node.down("item-a");                        // itemA.body == "TextA"

// Find a parent relative to `itemA`
var list = itemA.up("list");                               // list == vm.node

// Find a child with `item-b` key
var itemB = list.down("item-b");                           // itemB.body == "TextB"

// If `up` is called with no key it will return the root element
var root = itemB.up();                                     // root == vm.node

// Getting a sibling
var itemB = itemA.up("list").down("item-b");               // itemB.body == "TextB"
```

### Demos

Soon...