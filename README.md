domvm.js (DOM ViewModel)
------------------------
A thin, fast, dependency-free vdom view layer _(MIT Licensed)_

---
### Features

- Small - ~7k min, ~3k gzipped
- Very fast - see dbmonster & speedtest examples in `/test/bench`
- No dependencies, no build process
- Components - non-intrusive, composable & independently refreshable
- Isomorphic - generate markup server-side and attach on client
- Learn in 10min - small API surface, pure-js templates
- Emit custom events to parent components (bubbling)
- SVG & MathML support
- IE9+

---
### Usage/API

0. [Installation](#installation)
1. [Template Cheat Sheet](#template-cheat-sheet)
2. [Create, Modify, Redraw](#create-modify-redraw)
3. [Subviews, Components](#subviews-components)
4. [DOM Refs, after()](#dom-refs-after)
5. [Events, emit(), on:{}](#events-emit-on)
6. [Isomorphism, html(), attach()](#isomorphism-html-attach)
7. More docs to come...

---
#### Installation

**Browser**

```html
<script src="domvm.min.js"></script>
```

**Node**

```js
var domvm = require("domvm");
```

---
#### Template Cheat Sheet

```js
["p", "Hello"]												// plain tags
["p#foo.bar.baz", "Hello"]									// id and class shorthands
["input", {type: "checkbox", checked: true}]				// boolean attrs
["input", {type: "checkbox", ".checked": true}]				// set property instead of attr
["button", {onclick: function(e) {...}}, "Hello"]			// event handlers
["ul", {onclick: {".item": function(e) {...}}}, "Hello"]	// event handlers (delegated)
["p", {style: "font-size: 10pt;"}, "Hello"]					// style can be a string
["p", {style: {fontSize: "10pt"}}, "Hello"]					// ... or an object (camelCase only)

["h1", [													// explicit child array can follow tag
	["em", "Important!"],									// but first child cannot be a function
	["sub", "tiny"],										// or text node (see why below)
]]

["h1",														// or children can follow tag (JSONML)
	["em", "Important!"],									// this style has no restrictions
	["sub", "tiny"],
]

["a", {href: "/cows"},										// children can contain text nodes
	"foo",
	["br"],
	["strong", "bar"],
	"baz",
	function() { return ["div", "clown"]; },				// and functions returning a node
]

["p", function() {											// ... or funcs returning a body
	return [
		["span", "foo"],
		["em", "bar"],
	];
}]

["div",														// child sub-arrays get flattened
	["span", "some text"],
	[
		["strong", "stuff"],
		["em", "more stuff"],
	],
]

["#ui",														// same as div#ui
	[SomeViewFn]											// sub-view w/closured data
	[NavBarView, navbar],									// sub-view w/model
	[PanelView, panel, "panelA"],							// sub-view w/model & key
	preInitVm,												// pre-initialized ViewModel
]

// some special props...

["p", {_key: "myParag"}, "Some text"]						// keyed elements

["p", {_ref: "myParag"}, "Some text"]						// named reference

["div", {_guard: true}]										// guarded node (unmanaged)
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
	return {
		render: function() {
			return ["ul.people-list", people.map(function(person) {
				return ["li", person.name + " (aged " + person.age + ")"];
			})];
		}
	};
}

// create view model
var vm = domvm(PeopleView, myPeeps);

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

Let's split the above example into nested components/sub-views.

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

	return {
		render: function() {
			return ["ul.people-list", people.map(function(person) {
				return person.view;
			})];
		}
	}
}

function PersonView(vm, person) {
	person.vm = vm;

	return {
		render: function() {
			return ["li", person.name + " (aged " + person.age + ")"];
		}
	}
}

var myPeeps = [
	new Person("Peter", 31),
	new Person("Morgan", 27),
	new Person("Mark", 70),
];

var people = new People(myPeeps);

domvm(people.view).mount(document.body);

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

	return {
		render: function() {
			return ["ul.people-list", people.map(function(person) {
				return [PersonView, person];							// view/model coupling now defined in parent template
			})];
		}
	}
}

function PersonView(vm, person) {
	person.vm = vm;

	return {
		render: function() {
			return ["li", person.name + " (aged " + person.age + ")"];
		}
	}
}

var myPeeps = [
	new Person("Peter", 31),
	new Person("Morgan", 27),
	new Person("Mark", 70),
];

var people = new People(myPeeps);

domvm(PeopleView, people).mount(document.body);							// top-level view/model coupling now defined here
```

---
#### DOM Refs, after()

Get references to created DOM nodes.

```js
function SomeView(vm) {
	return {
		render: function() {
			return ["a", {href: "#", _ref: "myLink"}, "some link"];
		},
		after: function() {
			// this is called after every redraw/render and can be used to operate on the created DOM elements
			console.log("created link element", vm.refs.myLink)
		}
	}
}
```

---
#### Events, emit(), on:{}

Custom events can be triggered, bubbled and listened to in the view hierarchy, similar to DOM events.

```js
function ParentView(vm) {
	return {
		render: function() {
			return ["div", [
				ChildView
			]];
		},
		on: {
			myEvent: function(arg1, arg2) {
				console.log("caught myEvent", arguments);
			}
		}
	}
}

function ChildView(vm) {
	return {
		render: function() {
			return ["em", {onclick: function(e) { vm.emit("myEvent", ["arg1", "arg2"]); }}, "some text"];
		}
	}
}
```

1. Events normally bubble up the view tree and trigger all listeners that match the event name. But they can be targeted to specific ancestors (currently only by numeric level, but soon and more usefully by `_key`). To target an event only to the parent, use `vm.emit("myEvent:1")`. To target it only at the root view, just pick any large number: `vm.emit("myEvent:1000")`.
2. Since triggering an ancestor's `redraw()` from a child is such a common requirement, each view model is preloaded with a "_redraw" event listener in the emit system. You can trigger an ancestor's `redraw()` (e.g. root) from a child via `vm.emit("_redraw:1000")`. There is a shorthand for this case `vm.emit.redraw(targ)` where `targ` defaults to `1000` (root).
3. Event listeners that return `false` will stop further bubbling.

---
#### Isomorphism, html(), attach()

```js

function SomeView(vm) {
	return {
		render: function() {
			return ["div#foo", "foobar"];
		}
	}
}

// on the backend
var vm = domvm(SomeView, someModel);
// have server barf this html into the returned document
var html = vm.html();

// ...then on the front-end
var vm = domvm(SomeView, someModel);
// instead of mount(), use attach()
vm.attach(document.getElementById("foo"));
```

---
### Demos

Soon...