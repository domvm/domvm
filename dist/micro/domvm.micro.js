/**
* Copyright (c) 2017, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.full.js - DOM ViewModel
* A thin, fast, dependency-free vdom view layer
* @preserve https://github.com/leeoniya/domvm (2.x-dev, micro)
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.domvm = factory());
}(this, (function () { 'use strict';

// NOTE: if adding a new *VNode* type, make it < COMMENT and renumber rest.
// There are some places that test <= COMMENT to assert if node is a VNode

// VNode types
var ELEMENT	= 1;
var TEXT		= 2;
var COMMENT	= 3;

// placeholder types
var VVIEW		= 4;
var VMODEL		= 5;

var ENV_DOM = typeof window !== "undefined";
var TRUE = true;
var win = ENV_DOM ? window : {};
var rAF = win.requestAnimationFrame;

var emptyObj = {};

function noop() {}

var isArr = Array.isArray;

function isSet(val) {
	return val != null;
}

function isPlainObj(val) {
	return val != null && val.constructor === Object;		//  && typeof val === "object"
}

function insertArr(targ, arr, pos, rem) {
	targ.splice.apply(targ, [pos, rem].concat(arr));
}

function isVal(val) {
	var t = typeof val;
	return t === "string" || t === "number";
}

function isFunc(val) {
	return typeof val === "function";
}

function isProm(val) {
	return typeof val === "object" && isFunc(val.then);
}



function assignObj(targ) {
	var args = arguments;

	for (var i = 1; i < args.length; i++)
		{ for (var k in args[i])
			{ targ[k] = args[i][k]; } }

	return targ;
}

// export const defProp = Object.defineProperty;

function deepSet(targ, path, val) {
	var seg;

	while (seg = path.shift()) {
		if (path.length === 0)
			{ targ[seg] = val; }
		else
			{ targ[seg] = targ = targ[seg] || {}; }
	}
}

/*
export function deepUnset(targ, path) {
	var seg;

	while (seg = path.shift()) {
		if (path.length === 0)
			targ[seg] = val;
		else
			targ[seg] = targ = targ[seg] || {};
	}
}
*/

function sliceArgs(args, offs) {
	var arr = [];
	for (var i = offs; i < args.length; i++)
		{ arr.push(args[i]); }
	return arr;
}

function cmpObj(a, b) {
	for (var i in a)
		{ if (a[i] !== b[i])
			{ return false; } }

	return true;
}

function cmpArr(a, b) {
	var alen = a.length;

	if (b.length !== alen)
		{ return false; }

	for (var i = 0; i < alen; i++)
		{ if (a[i] !== b[i])
			{ return false; } }

	return true;
}

// https://github.com/darsain/raft
// rAF throttler, aggregates multiple repeated redraw calls within single animframe
function raft(fn) {
	if (!rAF)
		{ return fn; }

	var id, ctx, args;

	function call() {
		id = 0;
		fn.apply(ctx, args);
	}

	return function() {
		ctx = this;
		args = arguments;
		if (!id) { id = rAF(call); }
	};
}

function curry(fn, args, ctx) {
	return function() {
		return fn.apply(ctx, args);
	};
}



// adapted from https://github.com/Olical/binary-search
function binaryKeySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;

	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess].key === item) { return guess; }
			else {
				if (list[guess].key < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess].key === item) { return guess; }
			else {
				if (list[guess].key < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}

    return -1;
}

function isEvProp(name) {
	return name[0] === "o" && name[1] === "n";
}

function isSplProp(name) {
	return name[0] === "_";
}

function isStyleProp(name) {
	return name === "style";
}

function repaint(node) {
	node && node.el && node.el.offsetHeight;
}

// tests interactive props where real val should be compared
function isDynProp(tag, attr) {
//	switch (tag) {
//		case "input":
//		case "textarea":
//		case "select":
//		case "option":
			switch (attr) {
				case "value":
				case "checked":
				case "selected":
//				case "selectedIndex":
					return true;
			}
//	}

	return false;
}

function getVm(n) {
	n = n || emptyObj;
	while (n.vm == null && n.parent)
		{ n = n.parent; }
	return n.vm;
}

var unitlessProps = {
	animationIterationCount: TRUE,
	boxFlex: TRUE,
	boxFlexGroup: TRUE,
	columnCount: TRUE,
	counterIncrement: TRUE,
//	fillOpacity: TRUE,
	flex: TRUE,
	flexGrow: TRUE,
	flexOrder: TRUE,
	flexPositive: TRUE,
	flexShrink: TRUE,
	float: TRUE,
	fontWeight: TRUE,
	gridColumn: TRUE,
	lineHeight: TRUE,
	lineClamp: TRUE,
	opacity: TRUE,
	order: TRUE,
	orphans: TRUE,
//	stopOpacity: TRUE,
//	strokeDashoffset: TRUE,
//	strokeOpacity: TRUE,
//	strokeWidth: TRUE,
	tabSize: TRUE,
	transform: TRUE,
	transformOrigin: TRUE,
	widows: TRUE,
	zIndex: TRUE,
	zoom: TRUE,
};

function autoPx(name, val) {
	// typeof val === 'number' is faster but fails for numeric strings
	return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
}

var tagCache = {};

var RE_ATTRS = /\[(\w+)(?:=(\w+))?\]/g;

//	function VTag() {}
function cssTag(raw) {
	var cached = tagCache[raw];

	if (cached == null) {
		var tag, id, cls, attr;

		tagCache[raw] = cached = {
			tag:	(tag	= raw.match( /^[-\w]+/))		?	tag[0]						: "div",
			id:		(id		= raw.match( /#([-\w]+)/))		? 	id[1]						: null,
			class:	(cls	= raw.match(/\.([-\w.]+)/))		?	cls[1].replace(/\./g, " ")	: null,
			attrs:	null,
		};

		while (attr = RE_ATTRS.exec(raw)) {
			if (cached.attrs == null)
				{ cached.attrs = {}; }
			cached.attrs[attr[1]] = attr[2] || "";
		}
	}

	return cached;
}

/* example flyd adapter:
{
	is:		s => flyd.isStream(s),
	val:	s => s(),
	sub:	(s,fn) => flyd.on(fn, s),
	unsub:	s => s.end(),
}
*/


// creates a one-shot self-ending stream that redraws target vm
// TODO: if it's already registered by any parent vm, then ignore to avoid simultaneous parent & child refresh

// stubs for optional addons that still exist in code so need lightweight impls to run
function isStreamStub() { return false; }

var hookStreamStub = noop;

// assumes if styles exist both are objects or both are strings
function patchStyle(n, o) {
	var ns =     (n.attrs || emptyObj).style;
	var os = o ? (o.attrs || emptyObj).style : null;

	// replace or remove in full
	if (ns == null || isVal(ns))
		{ n.el.style.cssText = ns; }
	else {
		for (var nn in ns) {
			var nv = ns[nn];

			if (isStreamStub(nv))
				{ nv = hookStreamStub(nv, getVm(n)); }

			if (os == null || nv != null && nv !== os[nn])
				{ n.el.style[nn] = autoPx(nn, nv); }
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					{ n.el.style[on] = ""; }
			}
		}
	}
}

var didQueue = [];

function fireHook(did, fn, o, n, immediate) {
	if (did) {	// did*
		//	console.log(name + " should queue till repaint", o, n);
		immediate ? repaint(o.parent) && fn(o, n) : didQueue.push([fn, o, n]);
	}
	else {		// will*
		//	console.log(name + " may delay by promise", o, n);
		return fn(o, n);		// or pass  done() resolver
	}
}

function fireHooks(name, o, n, immediate) {
	var hook = o.hooks[name];

	if (hook) {
		var did = name[0] === "d" && name[1] === "i" && name[2] === "d";

		if (isArr(hook)) {
			// TODO: promise.all() this?
			return hook.map(function(hook2) {
				return fireHook(did, hook2, o, n);
			});
		}
		else
			{ return fireHook(did, hook, o, n, immediate); }
	}
}

function VNode() {}

var VNodeProto = VNode.prototype = {
	constructor: VNode,

	type:	null,

	vm:		null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	key:	null,
	ref:	null,
	data:	null,
	hooks:	null,
	raw:	false,
	ns:		null,

	el:		null,

	tag:	null,
	attrs:	null,
	body:	null,

	flags:	0,

	_class:	null,

	idx:	null,
	parent:	null,

	/*
	// break out into optional fluent module
	key:	function(val) { this.key	= val; return this; },
	ref:	function(val) { this.ref	= val; return this; },		// deep refs
	data:	function(val) { this.data	= val; return this; },
	hooks:	function(val) { this.hooks	= val; return this; },		// h("div").hooks()
	html:	function(val) { this.html	= true; return this.body(val); },

	body:	function(val) { this.body	= val; return this; },
	*/
};

// (de)optimization flags

// prevents inserting/removing/reordering of children
var FIXED_BODY = 1;
// forces slow bottom-up removeChild to fire deep willRemove/willUnmount hooks,
var DEEP_REMOVE = 2;
// enables fast keyed lookup of children via binary search, expects homogeneous keyed body
var KEYED_LIST = 4;

function initElementNode(tag, attrs, body, flags) {
	var node = new VNode;

	node.type = ELEMENT;

	if (isSet(flags))
		{ node.flags = flags; }

	if (isSet(attrs)) {
		if (isSet(attrs._key))
			{ node.key = attrs._key; }

		if (isSet(attrs._ref))
			{ node.ref = attrs._ref; }

		if (isSet(attrs._hooks))
			{ node.hooks = attrs._hooks; }

		if (isSet(attrs._raw))
			{ node.raw = attrs._raw; }

		if (isSet(attrs._data))
			{ node.data = attrs._data; }

		if (isSet(attrs._flags))
			{ node.flags = attrs._flags; }

		if (!isSet(node.key)) {
			if (isSet(node.ref))
				{ node.key = node.ref; }
			else if (isSet(attrs.id))
				{ node.key = attrs.id; }
			else if (isSet(attrs.name))
				{ node.key = attrs.name; }
		}

		node.attrs = attrs;
	}

	var parsed = cssTag(tag);

	node.tag = parsed.tag;

	if (parsed.id || parsed.class || parsed.attrs) {
		var p = node.attrs || {};

		if (parsed.id && !isSet(p.id))
			{ p.id = parsed.id; }

		if (parsed.class) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (isSet(p.class) ? (" " + p.class) : "");
		}
		if (parsed.attrs) {
			for (var key in parsed.attrs)
				{ if (!isSet(p[key]))
					{ p[key] = parsed.attrs[key]; } }
		}

//		if (node.attrs !== p)
			node.attrs = p;
	}

	if (body != null)
		{ node.body = body; }

	return node;
}

var doc = ENV_DOM ? document : null;

function closestVNode(el) {
	while (el._node == null)
		{ el = el.parentNode; }
	return el._node;
}

function createElement(tag, ns) {
	if (ns != null)
		{ return doc.createElementNS(ns, tag); }
	return doc.createElement(tag);
}

function createTextNode(body) {
	return doc.createTextNode(body);
}

function createComment(body) {
	return doc.createComment(body);
}

// ? removes if !recycled
function nextSib(sib) {
	return sib.nextSibling;
}

// ? removes if !recycled
function prevSib(sib) {
	return sib.previousSibling;
}

// TODO: this should collect all deep proms from all hooks and return Promise.all()
function deepNotifyRemove(node) {
	var hooks = node.hooks, vm = node.vm;

	vm && vm.hooks && fireHooks("willUnmount", vm);

	var res = hooks && fireHooks("willRemove", node);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE && isArr(node.body)) {
		for (var i = 0; i < node.body.length; i++)
			{ deepNotifyRemove(node.body[i]); }
	}

	return res;
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, hooks = node.hooks, vm = node.vm;

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE && isArr(node.body)) {
	//	var parEl = node.el;
		for (var i = 0; i < node.body.length; i++)
			{ _removeChild(el, node.body[i].el); }
	}

	parEl.removeChild(el);

	hooks && fireHooks("didRemove", node, null, immediate);

	vm && vm.hooks && fireHooks("didUnmount", vm, null, immediate);
}

// todo: should delay parent unmount() by returning res prom?
function removeChild(parEl, el) {
	var node = el._node, hooks = node.hooks;

	var res = deepNotifyRemove(node);

	if (res != null && isProm(res))
		{ res.then(curry(_removeChild, [parEl, el, true])); }
	else
		{ _removeChild(parEl, el); }
}

function clearChildren(parent) {
	var parEl = parent.el;

	if ((parent.flags & DEEP_REMOVE) === 0)
		{ parEl.textContent = null; }
	else {
		while (parEl.firstChild)
			{ removeChild(parEl, parEl.firstChild); }
	}
}

// todo: hooks
function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode != null;

	// el === refEl is asserted as a no-op insert called to fire hooks
	var vm = (el === refEl || !inDom) && node.vm;

	vm && vm.hooks && fireHooks("willMount", vm);

	hooks && fireHooks(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? "didReinsert" : "didInsert", node);

	vm && vm.hooks && fireHooks("didMount", vm);
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}

var globalCfg = {
	onevent: noop,
};

function config(newCfg) {
	assignObj(globalCfg, newCfg);
}

function bindEv(el, type, fn) {
//	DEBUG && console.log("addEventListener");
	el[type] = fn;
}

function handle(e, fn, args) {
	var node = closestVNode(e.target);
	var vm = getVm(node);
	var out = fn.apply(null, args.concat(e, node, vm));
	globalCfg.onevent.apply(null, [e, node, vm].concat(args));

	if (out === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function wrapHandler(fn, args) {
//	console.log("wrapHandler");

	return function wrap(e) {
		handle(e, fn, args);
	};
}

// delagated handlers {".moo": [fn, a, b]}, {".moo": fn}
function wrapHandlers(hash) {
//	console.log("wrapHandlers");

	return function wrap(e) {
		for (var sel in hash) {
			if (e.target.matches(sel)) {
				var hnd = hash[sel];
				var isarr = isArr(hnd);
				var fn = isarr ? hnd[0] : hnd;
				var args = isarr ? hnd.slice(1) : [];

				handle(e, fn, args);
			}
		}
	}
}

// could merge with on*

function patchEvent(node, name, nval, oval) {
	if (nval === oval)
		{ return; }

	var el = node.el;

	// param'd eg onclick: [myFn, 1, 2, 3...]
	if (isArr(nval)) {
		var diff = oval == null || !cmpArr(nval, oval);
		diff && bindEv(el, name, wrapHandler(nval[0], nval.slice(1)));
	}
	// basic onclick: myFn (or extracted)
	else if (isFunc(nval) && nval !== oval)
		{ bindEv(el, name, wrapHandler(nval, [])); }
	// delegated onclick: {".sel": myFn} & onclick: {".sel": [myFn, 1, 2, 3]}
	else		// isPlainObj, TODO:, diff with old/clean
		{ bindEv(el, name, wrapHandlers(nval)); }
}

function remAttr(node, name, asProp) {
	if (asProp)
		{ node.el[name] = ""; }
	else
		{ node.el.removeAttribute(name); }
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
function setAttr(node, name, val, asProp) {
	var el = node.el;

	if (val == null)
		{ remAttr(node, name); }		//, asProp?  // will also removeAttr of style: null
	else if (node.ns != null)
		{ el.setAttribute(name, val); }
	else if (name === "class")
		{ el.className = val; }
	else if (name === "id" || typeof val === "boolean" || asProp)
		{ el[name] = val; }
	else if (name[0] === ".")
		{ el[name.substr(1)] = val; }
	else
		{ el.setAttribute(name, val); }
}

function patchAttrs(vnode, donor) {
	var nattrs = vnode.attrs || emptyObj;
	var oattrs = donor.attrs || emptyObj;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);
		var oval = isDyn ? vnode.el[key] : oattrs[key];

		if (isStreamStub(nval))
			{ nattrs[key] = nval = hookStreamStub(nval, getVm(vnode)); }

		if (nval === oval) {}
		else if (isStyleProp(key))
			{ patchStyle(vnode, donor); }
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			{ patchEvent(vnode, key, nval, oval); }
		else
			{ setAttr(vnode, key, nval, isDyn); }
	}

	// TODO: handle key[0] === "."
	// should bench style.cssText = "" vs removeAttribute("style")
	for (var key in oattrs) {
		!(key in nattrs) &&
		!isSplProp(key) &&
		remAttr(vnode, key, isDynProp(vnode.tag, key) || isEvProp(key));
	}
}

function createView(view, model, key, opts) {
	if (view.type === VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}
	else if (view.prototype._isClass)
		{ return new view(model, key, opts); }

	return new ViewModel(view, model, key, opts);
}

//import { XML_NS, XLINK_NS } from './defineSvgElement';
// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);

		if (isStreamStub(nval))
			{ nattrs[key] = nval = hookStreamStub(nval, getVm(vnode)); }

		if (isStyleProp(key))
			{ patchStyle(vnode); }
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			{ patchEvent(vnode, key, nval); }
		else if (nval != null)
			{ setAttr(vnode, key, nval, isDyn); }
	}
}

function hydrateBody(vnode) {
	for (var i = 0; i < vnode.body.length; i++) {
		var vnode2 = vnode.body[i];
		var type2 = vnode2.type;

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT)
			{ insertBefore(vnode.el, hydrate(vnode2)); }		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 === VVIEW) {
			var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new model updates
			type2 = vm.node.type;
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 === VMODEL) {
			var vm = vnode2.vm;
			vm._redraw(vnode, i);					// , false
			type2 = vm.node.type;
			insertBefore(vnode.el, vm.node.el);		// , hydrate(vm.node)
		}
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
function hydrate(vnode, withEl) {
	if (vnode.el == null) {
		if (vnode.type === ELEMENT) {
			vnode.el = withEl || createElement(vnode.tag, vnode.ns);

		//	if (vnode.tag === "svg")
		//		vnode.el.setAttributeNS(XML_NS, 'xmlns:xlink', XLINK_NS);

			if (vnode.attrs != null)
				{ patchAttrs2(vnode); }

			if (isArr(vnode.body))
				{ hydrateBody(vnode); }
			else if (vnode.body != null && vnode.body !== "") {
				if (vnode.raw)
					{ vnode.el.innerHTML = vnode.body; }
				else
					{ vnode.el.textContent = vnode.body; }
			}
		}
		else if (vnode.type === TEXT)
			{ vnode.el = withEl || createTextNode(vnode.body); }
		else if (vnode.type === COMMENT)
			{ vnode.el = withEl || createComment(vnode.body); }
	}

	vnode.el._node = vnode;

	return vnode.el;
}

function nextNode(node, body) {
	return body[node.idx + 1];
}

function prevNode(node, body) {
	return body[node.idx - 1];
}

function parentNode(node) {
	return node.parent;
}

function tmpEdges(fn, parEl, lftSib, rgtSib) {
	// get outer immute edges
	var lftLft = prevSib(lftSib);
	var rgtRgt = nextSib(rgtSib);

	fn(lftLft, rgtRgt);

	return {
		lftSib: lftLft ? nextSib(lftLft) : parEl.firstChild,
		rgtSib: rgtRgt ? prevSib(rgtRgt) : parEl.lastChild,
	};
}

function headTailTry(parEl, lftSib, lftNode, rgtSib, rgtNode) {
	var areAdjacent	= rgtNode.idx === lftNode.idx + 1;
	var headToTail = areAdjacent ? false : lftSib._node === rgtNode;
	var tailToHead = areAdjacent ? true  : rgtSib._node === lftNode;

	if (headToTail || tailToHead) {
		return tmpEdges(function(lftLft, rgtRgt) {
			if (tailToHead)
				{ insertBefore(parEl, rgtSib, lftSib); }

			if (headToTail)
				{ insertBefore(parEl, lftSib, rgtRgt); }
		}, parEl, lftSib, rgtSib);
	}

	return null;
}

// init vm,

// selection sort of DOM (cause move cost >> cmp cost)
// todo: skip removed
function sortDOM(parEl, lftSib, rgtSib, cmpFn) {
//	DEBUG && console.log("selection sort!");

	return tmpEdges(function(lftLft, rgtRgt) {
		var min;

		for (var i = lftSib; i !== rgtRgt; i = nextSib(i)) {
			lftSib = min = i;

			for (var j = nextSib(i); j !== rgtRgt; j = nextSib(j)) {
				if (cmpFn(min, j) > 0)
					{ min = j; }
			}

			if (min === i)
				{ continue; }

			insertBefore(parEl, min, lftSib);

			i = min;
		}
	}, parEl, lftSib, rgtSib);
}

function cmpElNodeIdx(a, b) {
	return a._node.idx - b._node.idx;
}

function syncChildren(node, donor) {
	var parEl		= node.el,
		body		= node.body,
		obody		= donor.body,
		lftNode		= body[0],
		rgtNode		= body[body.length - 1],
		lftSib		= ((obody)[0] || emptyObj).el,
	//	lftEnd		= prevSib(lftSib),
		rgtSib		= (obody[obody.length - 1] || emptyObj).el,
	//	rgtEnd		= nextSib(rgtSib),
		newSibs,
		tmpSib,
		lsNode,
		rsNode;

	converge:
	while (1) {
//		from_left:
		while (1) {
			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib) {
				// skip dom elements not created by domvm
				if ((lsNode = lftSib._node) == null) {
					lftSib = nextSib(lftSib);
					continue;
				}

				if (parentNode(lsNode) !== node) {
					tmpSib = nextSib(lftSib);
					lsNode.vm != null ? lsNode.vm.unmount(true) : removeChild(parEl, lftSib);
					lftSib = tmpSib;
					continue;
				}
			}

			if (lftNode == null)		// reached end
				{ break converge; }
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);		// lftNode.vm != null ? lftNode.vm.mount(parEl, false, true, lftSib) :
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode.el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				{ break; }
		}

//		from_right:
		while (1) {
		//	if (rgtSib === lftEnd)
		//		break converge;

			if (rgtSib) {
				if ((rsNode = rgtSib._node) == null) {
					rgtSib = prevSib(rgtSib);
					continue;
				}

				if (parentNode(rsNode) !== node) {
					tmpSib = prevSib(rgtSib);
					rsNode.vm != null ? rsNode.vm.unmount(true) : removeChild(parEl, rgtSib);
					rgtSib = tmpSib;
					continue;
				}
			}

			if (rgtNode === lftNode)		// converged
				{ break converge; }
			else if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);		// rgtNode.vm != null ? rgtNode.vm.mount(parEl, false, true, nextSib(rgtSib) :
				rgtNode = prevNode(rgtNode, body);
			}
			else if (rgtNode.el === rgtSib) {
				rgtNode = prevNode(rgtNode, body);
				rgtSib = prevSib(rgtSib);
			}
			else
				{ break; }
		}

		if (newSibs = headTailTry(parEl, lftSib, lftNode, rgtSib, rgtNode)) {
			lftSib = newSibs.lftSib;
			rgtSib = newSibs.rgtSib;
			continue;
		}

		newSibs = sortDOM(parEl, lftSib, rgtSib, cmpElNodeIdx);
		lftSib = newSibs.lftSib;
		rgtSib = newSibs.rgtSib;
	}
}

function findDonor(n, obody, fromIdx, toIdx) {		// pre-tested isView?
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (n.type === VVIEW && o.vm != null) {			// also ignore recycled/moved?
			var ov = o.vm;

			// match by key & viewFn
			if (ov.view === n.view && ov.key === n.key)
				{ return o; }
		}

		if (o.el._node !== o || n.tag !== o.tag || n.type !== o.type || n.vm !== o.vm)
			{ continue; }

		// if n.view

		if (n.key === o.key)		// accounts for matching & both null
			{ return o; }
		else {
			//
			if (o.key == null) {
				return o;
			}
			// n.key && o.key, ident?
			else {
			//	console.log(n.key, o.key);
			}
		}
	}

	return null;
}

// list must be a sorted list of vnodes by key
function findListDonor(n, list) {
	var idx = binaryKeySearch(list, n.key);
	return idx > -1 ? list[idx] : null;
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
function patch(vnode, donor, isRedrawRoot) {
	donor.hooks && fireHooks("willRecycle", donor, vnode);

	var el = vnode.el = donor.el;

	var obody = donor.body;
	var nbody = vnode.body;

	el._node = vnode;

	// "" => ""
	if (vnode.type === TEXT && nbody !== obody) {
		el.nodeValue = nbody;
		return;
	}

	if (vnode.attrs != null || donor.attrs != null)
		{ patchAttrs(vnode, donor); }

	// patch events

	var oldIsArr = isArr(obody);
	var newIsArr = isArr(nbody);

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr) {
		//	console.log('[] => []', obody, nbody);
			// graft children
			patchChildren(vnode, donor, isRedrawRoot);
		}
		// [] => "" | null
		else if (nbody !== obody) {
			// needs cleanup pass?
		//	console.log('[] => ""', obody, nbody);

			if (nbody != null) {
				if (vnode.raw)
					{ el.innerHTML = nbody; }
				else
					{ el.textContent = nbody; }
			}
			else
				{ clearChildren(donor); }
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', obody, nbody);	// hydrate new here?
			clearChildren(donor);
			hydrateBody(vnode);
		}
		// "" | null => "" | null
		else if (nbody !== obody) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode.raw)
				{ el.innerHTML = nbody; }
			else if (el.firstChild)
				{ el.firstChild.nodeValue = nbody; }
			else
				{ el.textContent = nbody; }
		}
	}

	donor.hooks && fireHooks("didRecycle", donor, vnode);
}

function sortByKey(a, b) {
	return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
}

// [] => []
function patchChildren(vnode, donor, isRedrawRoot) {
	var nbody = vnode.body,
		nlen = nbody.length,
		domSync = donor.type === ELEMENT && (donor.flags & FIXED_BODY) === 0;

	if (domSync && nlen === 0) {
		clearChildren(donor);
		return;
	}

	var isList = (donor.flags & KEYED_LIST) === KEYED_LIST;

	if (isList) {
		var list = donor.body.slice();
		list.sort(sortByKey);
		var find = findListDonor;
	}
	else {
		var list = donor.body;
		var find = findDonor;
	}

	var donor2,
		fromIdx = 0;				// first unrecycled node (search head)

	for (var i = 0; i < nlen; i++) {
		var node2 = nbody[i];
		var type2 = node2.type;

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT) {
			if (donor2 = find(node2, list, fromIdx))
				{ patch(node2, donor2); }
		}
		else if (type2 === VVIEW) {
			if (donor2 = find(node2, list, fromIdx))		// update/moveTo
				{ var vm = donor2.vm._update(node2.model, vnode, i); }		// withDOM
			else
				{ var vm = createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false); }	// createView, no dom (will be handled by sync below)

			type2 = vm.node.type;
		}
		else if (type2 === VMODEL) {
			var vm = node2.vm._update(node2.model, vnode, i);
			type2 = vm.node.type;
		}

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex
		if (!isList && donor2 != null && donor2.idx === fromIdx)
			{ fromIdx++; }
	}


	domSync && syncChildren(vnode, donor);
}

function defineText(body) {
	var node = new VNode;
	node.type = TEXT;
	node.body = body;
	return node;
}

function setRef(vm, name, node) {
	var path = ["refs"].concat(name.split("."));
	deepSet(vm, path, node);
}

function setDeepRemove(node) {
	while (node = node.parent)
		{ node.flags |= DEEP_REMOVE; }
}

// vnew, vold
function preProc(vnew, parent, idx, ownVm) {
	if (vnew.type === VMODEL || vnew.type === VVIEW)
		{ return; }

	vnew.parent = parent;
	vnew.idx = idx;
	vnew.vm = ownVm;

	if (vnew.ref != null)
		{ setRef(getVm(vnew), vnew.ref, vnew); }

	if (vnew.hooks && vnew.hooks.willRemove || ownVm && ownVm.hooks && ownVm.hooks.willUnmount)
		{ setDeepRemove(vnew); }

	if (isArr(vnew.body)) {
		// declarative elems, comments, text nodes
		var body = vnew.body;

		for (var i = 0; i < body.length; i++) {
			var node2 = body[i];

			// remove false/null/undefined
			if (node2 === false || node2 == null)
				{ body.splice(i--, 1); }
			// flatten arrays
			else if (isArr(node2))
				{ insertArr(body, node2, i--, 1); }
			else {
				if (node2.type == null)
					{ body[i] = node2 = defineText(""+node2); }

				if (node2.type === TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body === "")
						{ body.splice(i--, 1); }
					// merge with previous text node
					else if (i > 0 && body[i-1].type === TEXT) {
						body[i-1].body += node2.body;
						body.splice(i--, 1);
					}
					else
						{ preProc(node2, vnew, i, null); }
				}
				else
					{ preProc(node2, vnew, i, null); }
			}
		}
	}
	else if (isStreamStub(vnew.body))
		{ vnew.body = hookStreamStub(vnew.body, getVm(vnew)); }
}

function ViewModel(view, model, key, opts) {			// parent, idx, parentVm
	var vm = this;

	vm.view = view;
	vm.model = model;
	vm.key = key == null ? model : key;

	if (!view.prototype._isClass) {
		var out = view.call(vm, vm, model, key, opts);

		if (isFunc(out))
			{ vm.render = out; }
		else {
			if (out.diff) {
				vm.diff(out.diff);
				delete out.diff;
			}

			assignObj(vm, out);
		}
	}
	else {
	//	handle .diff re-definiton
		var vdiff = vm.diff;

		if (vdiff != null && vdiff !== ViewModelProto.diff) {
			vm.diff = ViewModelProto.diff.bind(vm);
			vm.diff(vdiff);
		}
	}

	// remove this?
	if (opts) {
		vm.opts = opts;

		if (opts.hooks)
			{ vm.hook(opts.hooks); }
		if (opts.diff)
			{ vm.diff(opts.diff); }
	}

	// these must be created here since debounced per view
	vm._redrawAsync = raft(function (_) { return vm._redraw(); });
	vm._updateAsync = raft(function (newModel) { return vm._update(newModel); });

	var hooks = vm.hooks;

	if (hooks && hooks.didInit)
		{ hooks.didInit.call(vm, vm, model, key, opts); }

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

var ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	_isClass: false,

	// view + key serve as the vm's unique identity
	view: null,
	key: null,
	model: null,
	opts: null,
	node: null,
//	diff: null,
//	diffLast: null,	// prior array of diff values
	hooks: null,
	render: null,

//	_setRef: function() {},

	// as plugins?
	parent: function() {
		return getVm(this.node.parent);
	},

	root: function() {
		var p = this.node;

		while (p.parent)
			{ p = p.parent; }

		return p.vm;
	},

	api: null,
	refs: null,
	mount: mount,
	unmount: unmount,
	redraw: function(sync) {
		var vm = this;
		sync ? vm._redraw() : vm._redrawAsync();
		return vm;
	},
	update: function(newModel, sync) {
		var vm = this;
		sync ? vm._update(newModel) : vm._updateAsync(newModel);
		return vm;
	},

	_update: updateSync,
	_redraw: redrawSync,	// non-coalesced / synchronous
	_redrawAsync: null,		// this is set in constructor per view
	_updateAsync: null,

	hook: function(hooks) {
		this.hooks = this.hooks || assignObj({}, this.hooks, hooks);
	},
};


function drainDidHooks(vm) {
	if (didQueue.length) {
		repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			{ item[0](item[1], item[2]); }
	}
}

/*
function isEmptyObj(o) {
	for (var k in o)
		return false;
	return true;
}
*/

function mount(el, isRoot) {		// , asSub, refEl
	var vm = this;

	if (isRoot) {
		clearChildren({el: el, flags: 0});

		vm._redraw(null, null, false);

		// if placeholder node doesnt match root tag
		if (el.nodeName.toLowerCase() !== vm.node.tag) {
			hydrate(vm.node);
			insertBefore(el.parentNode, vm.node.el, el);
			el.parentNode.removeChild(el);
		}
		else
			{ insertBefore(el.parentNode, hydrate(vm.node, el), el); }
	}
	else {
		vm._redraw(null, null);

		if (el)
			{ insertBefore(el, vm.node.el); }			// el.appendChild(vm.node.el);
	}

	if (el)
		{ drainDidHooks(vm); }

	return vm;
}

// asSub = true means this was called from a sub-routine, so don't drain did* hook queue
// immediate = true means did* hook will not be queued (usually cause this is a promise resolution)
function unmount(asSub) {
	var vm = this;

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	if (!asSub)
		{ drainDidHooks(vm); }
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
	var isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

	var vold = vm.node;

	// no diff, just re-parent old
	// TODO: allow returning vm.node as no-change indicator
	if (isMounted && vm._diff != null && vm._diff()) {
		// will doing this outside of preproc cause de-opt, add shallow opt to preproc?
		if (vold && newParent) {
			newParent.body[newIdx] = vold;
			vold.idx = newIdx;
			vold.parent = newParent;
		}
		return vm;
	}

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	vm.refs = null;

	var vnew = vm.render.call(vm, vm, vm.model, vm.key);		// vm.opts

	// always assign vm key to root vnode (this is a de-opt)
	if (vm.key !== false && vm.key != null && vnew.key !== vm.key)
		{ vnew.key = vm.key; }

//	console.log(vm.key);

	vm.node = vnew;

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm);
		newParent.body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold.parent) {
		preProc(vnew, vold.parent, vold.idx, vm);
		vold.parent.body[vold.idx] = vnew;
	}
	else
		{ preProc(vnew, null, null, vm); }

	if (withDOM !== false) {
		if (vold) {
			// root node replacement
			if (vold.tag !== vnew.tag) {
				// hack to prevent the replacement from triggering mount/unmount
				vold.vm = vnew.vm = null;

				var parEl = vold.el.parentNode;
				var refEl = nextSib(vold.el);
				removeChild(parEl, vold.el);
				insertBefore(parEl, hydrate(vnew), refEl);

				// another hack that allows any higher-level syncChildren to set
				// reconciliation bounds using a live node
				vold.el = vnew.el;

				// restore
				vnew.vm = vm;
			}
			else
				{ patch(vnew, vold, isRedrawRoot); }
		}
		else
			{ hydrate(vnew); }
	}

	isMounted && vm.hooks && fireHooks("didRedraw", vm);

	if (isRedrawRoot && isMounted)
		{ drainDidHooks(vm); }

	return vm;
}

// withRedraw?
// this doubles as moveTo
// will/didUpdate
function updateSync(newModel, newParent, newIdx, withDOM) {			// parentVm
	var vm = this;

	if (newModel != null) {		// && vm.key !== vm.model
		if (vm.model !== newModel) {
			vm.hooks && fireHooks("willUpdate", vm, newModel);		// willUpdate will be called ahead of willRedraw when model will be replaced
			vm.model = newModel;
		//	vm.hooks && fireHooks("didUpdate", vm, newModel);		// should this fire at al?
		}
	}

	// TODO: prevent redraw from firing?

	return vm._redraw(newParent, newIdx, withDOM);
/*
	if (parentVm != null) {
		vm.parent = parentVm;
		parentVm.body.push(vm);
	}
*/
}

function defineElement(tag, arg1, arg2, flags) {
	var attrs, body;

	if (arg2 == null) {
		if (isPlainObj(arg1))
			{ attrs = arg1; }
		else
			{ body = arg1; }
	}
	else {
		attrs = arg1;
		body = arg2;
	}

	return initElementNode(tag, attrs, body, flags);
}

//export const XML_NS = "http://www.w3.org/2000/xmlns/";
var SVG_NS = "http://www.w3.org/2000/svg";
//export const XLINK_NS = "http://www.w3.org/1999/xlink";

function defineSvgElement(tag, arg1, arg2, flags) {
	var n = defineElement(tag, arg1, arg2, flags);
	n.ns = SVG_NS;
	return n;
}

function defineComment(body) {
	var node = new VNode;
	node.type = COMMENT;
	node.body = body;
	return node;
}

// placeholder for declared views
function VView(view, model, key, opts) {
	this.view = view;
	this.model = model;
	this.key = key == null ? model : key;	// same logic as ViewModel
	this.opts = opts;
}

VView.prototype = {
	constructor: VView,

	type: VVIEW,
	view: null,
	model: null,
	key: null,
	opts: null,
};

function defineView(view, model, key, opts) {
	return new VView(view, model, key, opts);
}

// placeholder for injected ViewModels
function VModel(vm) {
	this.vm = vm;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vm: null,
};

function injectView(vm) {
//	if (vm.node == null)
//		vm._redraw(null, null, false);

//	return vm.node;

	return new VModel(vm);
}

function injectElement(el) {
	var node = new VNode;
	node.type = ELEMENT;
	node.el = node.key = el;
	return node;
}

// prevent GCC from inlining some large funcs (which negatively affects Chrome's JIT)
window.syncChildren = syncChildren;

var nano = {
	config: config,

	ViewModel: ViewModel,
	VNode: VNode,

	createView: createView,

	defineElement: defineElement,
	defineSvgElement: defineSvgElement,
	defineText: defineText,
	defineComment: defineComment,
	defineView: defineView,

	injectView: injectView,
	injectElement: injectElement,

	FIXED_BODY: FIXED_BODY,
	DEEP_REMOVE: DEEP_REMOVE,
	KEYED_LIST: KEYED_LIST,
};

ViewModelProto._diff = null;

// @vals should be a callback that returns an array or object of values to shallow-compare
//   if the returned values are the same on subsequent redraw calls, then redraw() is prevented
// @then may be a callback that will run if arrays dont match and receives the old & new arrays which
//   it can then use to shallow-patch the top-level vnode if needed (like apply {display: none}) and
//   return `false` to prevent further redraw()
// if @cfg is a function, it's assumed to be @vals
ViewModelProto.diff = function(cfg) {
	var vm = this;

	if (isFunc(cfg))
		{ var getVals = cfg; }
	else {
		var getVals = cfg.vals;
		var thenFn = cfg.then;
	}

	var oldVals = getVals.call(vm, vm, vm.model, vm.key, vm.opts);
	var cmpFn = isArr(oldVals) ? cmpArr : cmpObj;

	vm._diff = function() {
		var newVals = getVals.call(vm, vm, vm.model, vm.key, vm.opts);
		var isSame = cmpFn(oldVals, newVals);

		if (!isSame) {
			// thenFn must return false to prevent redraw
			if (thenFn != null && thenFn.call(vm, vm, oldVals, newVals) === false)
				{ isSame = true; }

			oldVals = newVals;
		}

		return isSame;
	};
};

VNodeProto.patch = function(n) {
	return patch$1(this, n);
};

// newNode can be either {class: style: } or full new VNode
// will/didPatch hooks?
function patch$1(o, n) {
	if (n.type != null) {
		// no full patching of view roots, just use redraw!
		if (o.vm != null)
			{ return; }

		preProc(n, o.parent, o.idx, null);
		o.parent.body[o.idx] = n;
//		o.parent = o.el = o.body = null;		// helps gc?
		patch(n, o);
		drainDidHooks(getVm(n));
	}
	else {
		// TODO: re-establish refs

		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);
		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, n);
		// prepend any fixed shorthand class
		if (o._class != null) {
			var aclass = oattrs.class;
			oattrs.class = aclass != null && aclass !== "" ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}

// #destub: cssTag,autoPx

ViewModelProto.events = null;
ViewModelProto.emit = emit;
ViewModelProto.on = on;

function emit(evName) {
	var arguments$1 = arguments;

	var targ = this;

	do {
		var evs = targ.events;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(null, sliceArgs(arguments$1, 1));
			break;
		}

	} while (targ = targ.parent());
}

function on(evName, fn) {
	var t = this;

	if (t.events == null)
		{ t.events = {}; }

	if (isVal(evName))
		{ t.events[evName] = fn; }
	else {
		var evs = evName;
		for (var evName in evs)
			{ t.on(evName, evs[evName]); }
	}
}

/*
defProp(ViewModelProto, 'body', {
	get: function() {
		return nextSubVms(this.node, []);
	}
});
*/

ViewModelProto.body = function() {
	return nextSubVms(this.node, []);
};

function nextSubVms(n, accum) {
	var body = n.body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2.vm != null)
				{ accum.push(n2.vm); }
			else
				{ nextSubVms(n2, accum); }
		}
	}

	return accum;
}

// #destub: cssTag,autoPx

return nano;

})));
//# sourceMappingURL=domvm.micro.js.map
