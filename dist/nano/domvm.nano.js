/**
* Copyright (c) 2016, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.full.js - DOM ViewModel
* A thin, fast, dependency-free vdom view layer
* @preserve https://github.com/leeoniya/domvm (2.x-dev)
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.domvm = factory());
}(this, (function () { 'use strict';

var ELEMENT	= 1;
var TEXT		= 2;
var COMMENT	= 3;
// placeholder nodes
var VVIEW		= 4;
var VMODEL		= 5;

var ENV_DOM = typeof HTMLElement == "function";
var win = ENV_DOM ? window : {};
var rAF = win.requestAnimationFrame;

var emptyObj = {};

function startsWith(haystack, needle) {
	return haystack.lastIndexOf(needle, 0) === 0;
}

var isArr = Array.isArray;

function isPlainObj(val) {
	return val != null && val.constructor == Object;		//  && typeof val == "object"
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
		if (path.length == 0)
			{ targ[seg] = val; }
		else
			{ targ[seg] = targ = targ[seg] || {}; }
	}
}

/*
export function deepUnset(targ, path) {
	var seg;

	while (seg = path.shift()) {
		if (path.length == 0)
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

	if (b.length != alen)
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

function isEvProp(name) {
	return startsWith(name, "on");
}

function isSplProp(name) {
	return name[0] == "_";
}

function isStyleProp(name) {
	return name == "style";
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
				case "selectedIndex":
					return true;
			}
//	}

	return false;
}

var t = true;

var unitlessProps = {
	animationIterationCount: t,
	boxFlex: t,
	boxFlexGroup: t,
	columnCount: t,
	counterIncrement: t,
	fillOpacity: t,
	flex: t,
	flexGrow: t,
	flexOrder: t,
	flexPositive: t,
	flexShrink: t,
	float: t,
	fontWeight: t,
	gridColumn: t,
	lineHeight: t,
	lineClamp: t,
	opacity: t,
	order: t,
	orphans: t,
	stopOpacity: t,
	strokeDashoffset: t,
	strokeOpacity: t,
	strokeWidth: t,
	tabSize: t,
	transform: t,
	transformOrigin: t,
	widows: t,
	zIndex: t,
	zoom: t,
};

function autoPx(name, val) {
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

var isStream = function() { return false };

var streamVal = null;
var subStream = null;
var unsubStream = null;

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
function hookStreamStub() { }

// assumes if styles exist both are objects or both are strings
function patchStyle(n, o) {
	var ns = n.attrs.style;
	var os = o ? o.attrs.style : null;		// || emptyObj?

	// replace or remove in full
	if (ns == null || isVal(ns))
		{ n.el.style.cssText = ns; }
	else {
		for (var nn in ns) {
			var nv = ns[nn];

			if (isStreamStub(nv))
				{ nv = hookStreamStub(nv, n.vm()); }

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

function bindEv(el, type, fn) {
//	DEBUG && console.log("addEventListener");
	el[type] = fn;
}

function handle(e, fn, args) {
	var node = e.currentTarget._node;
	var out = fn.apply(null, args.concat(e, node, node.vm()));

	if (out === false) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function wrapHandler(fn, args) {
//	console.log("wrapHandler");

	return function wrap(e) {
		handle(e, fn, args);
	}
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
	else if (isFunc(nval) && nval != oval)
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
	else if (name == "class")
		{ el.className = val; }
	else if (name == "id" || typeof val == "boolean" || asProp)
		{ el[name] = val; }
	else if (name[0] == ".")
		{ el[name.substr(1)] = val; }
	else
		{ el.setAttribute(name, val); }
}

function patchAttrs(vnode, donor) {
	var nattrs = vnode.attrs || emptyObj;
	var oattrs = donor.attrs || emptyObj;
	var tag = vnode.tag;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(tag, key);
		var oval = isDyn ? vnode.el[key] : oattrs[key];

		if (isStreamStub(nval))
			{ nattrs[key] = nval = hookStreamStub(nval, vnode.vm()); }

		if (nval === oval) {}
		else if (isStyleProp(key))
			{ patchStyle(vnode, donor); }
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			{ patchEvent(vnode, key, nval, oval); }
		else
			{ setAttr(vnode, key, nval, isDyn); }
	}

	for (var key in oattrs) {
	//	if (nattrs[key] == null &&
		if (!(key in nattrs) &&
			!isStyleProp(key) &&
			!isSplProp(key) &&
			!isEvProp(key)
		)
			{ remAttr(vnode, key, isDynProp(tag, key)); }
	}
}

function createView(view, model, key, opts) {
	if (view.type == VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	return new ViewModel(view, model, key, opts);
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
		var did = startsWith(name, "did");

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

	vm: function() {
		var n = this;

		do {
			if (n.vmid != null)
				{ return views[n.vmid]; }
		} while (n.parent && (n = n.parent));
	},

	vmid:	null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	key:	null,
	ref:	null,
	data:	null,
	hooks:	null,
	raw:	false,

	el:		null,

	tag:	null,
	attrs:	null,
	body:	null,

	_flags:	0,

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

// optimization flags

// prevents inserting/removing/reordering of children
var FIXED_BODY = 1;
// doesnt fire eager deep willRemove hooks, doesnt do bottom-up removeChild
var FAST_REMOVE = 2;

function initElementNode(tag, attrs, body, flags) {
	var node = new VNode;

	node.type = ELEMENT;

	if (flags != null)
		{ node._flags = flags; }

	if (attrs != null) {
		if (attrs._key != null)
			{ node.key = attrs._key; }

		if (attrs._ref != null)
			{ node.ref = attrs._ref; }

		if (attrs._hooks != null)
			{ node.hooks = attrs._hooks; }

		if (attrs._raw != null)
			{ node.raw = attrs._raw; }

		if (attrs._data != null)
			{ node.data = attrs._data; }

		if (node.key == null) {
			if (node.ref != null)
				{ node.key = node.ref; }
			else if (attrs.id != null)
				{ node.key = attrs.id; }
			else if (attrs.name != null)
				{ node.key = attrs.name; }
		}

		node.attrs = attrs;
	}

	var parsed = cssTag(tag);

	node.tag = parsed.tag;

	if (parsed.id || parsed.class || parsed.attrs) {
		var p = node.attrs || {};

		if (parsed.id && p.id == null)
			{ p.id = parsed.id; }

		if (parsed.class) {
			node._class = parsed.class;		// static class
			p.class = parsed.class + (p.class != null ? (" " + p.class) : "");
		}
		if (parsed.attrs) {
			for (var key in parsed.attrs)
				{ if (p[key] == null)
					{ p[key] = parsed.attrs[key]; } }
		}

//		if (node.attrs != p)
			node.attrs = p;
	}

	if (body != null)
		{ node.body = body; }

	return node;
}

var doc = document;

function createElement(tag) {
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
	var hooks = node.hooks;
	var vm = node.vmid != null ? node.vm() : null;

	vm && vm.hooks && fireHooks("willUnmount", vm);

	var res = hooks && fireHooks("willRemove", node);

	if (!(node._flags & FAST_REMOVE) && isArr(node.body))
		{ node.body.forEach(deepNotifyRemove); }

	return res;
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, hooks = node.hooks;

	var vm = node.vmid != null ? node.vm() : null;

//	if (node.ref != null && node.ref[0] == "^")			// this will fail for fixed-nodes?
//		console.log("clean exposed ref", node.ref);

	if (!(node._flags & FAST_REMOVE) && isArr(node.body)) {
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

// todo: hooks
function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;

	var vm = !inDom && node.vmid != null ? node.vm() : null;

	vm && vm.hooks && fireHooks("willMount", vm);

	// this first happens during view creation, but if view is
	// ever unmounted & remounted later, need to re-register
	vm && (views[vm.id] = vm);

	hooks && fireHooks(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? "didReinsert" : "didInsert", node);

	vm && vm.hooks && fireHooks("didMount", vm);
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}

// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);

		if (isStreamStub(nval))
			{ nattrs[key] = nval = hookStreamStub(nval, vnode.vm()); }

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

		if (type2 == ELEMENT || type2 == TEXT || type2 == COMMENT)
			{ insertBefore(vnode.el, hydrate(vnode2)); }		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 == VVIEW) {
			var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new model updates
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 == VMODEL) {
			var vm = views[vnode2.vmid];
			vm._redraw(vnode, i);					// , false
			insertBefore(vnode.el, vm.node.el);		// , hydrate(vm.node)
		}
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
function hydrate(vnode, withEl) {
	if (vnode.el == null) {
		if (vnode.type == ELEMENT) {
			vnode.el = withEl || createElement(vnode.tag);

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
		else if (vnode.type == TEXT)
			{ vnode.el = withEl || createTextNode(vnode.body); }
		else if (vnode.type == COMMENT)
			{ vnode.el = withEl || createComment(vnode.body); }
	}

	vnode.el._node = vnode;

	return vnode.el;
}

//import { DEBUG } from './DEBUG';

function nextNode(node, body) {
	return body[node.idx + 1];
}

function prevNode(node, body) {
	return body[node.idx - 1];
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
//	DEBUG && console.log("try head/tail magic");

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

function syncChildren(node) {
	var parEl = node.el;
	var body = node.body;
	// breaking condition is convergance

	var lftNode		= body[0],
		lftSib		= parEl.firstChild,
		rgtNode		= body[body.length - 1],
		rgtSib		= parEl.lastChild,
		newSibs,
		tmpSib;

	if (lftSib == null) {
		body.forEach(function (node2) { return parEl.appendChild(hydrate(node2)); });
		return;
	}
	else if (lftNode == null) {
//		DEBUG && console.log("todo: full dehydrate");
	}

	converge:
	while (1) {
//		DEBUG && console.log("from_left");
//		from_left:
		while (1) {
			if (lftSib)
				{ var lsNode = lftSib._node; }

			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib && lsNode.parent != node) {
				tmpSib = nextSib(lftSib);
				lsNode.vmid != null ? lsNode.vm().unmount(true) : removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				{ break converge; }
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);		// lftNode.vmid != null ? lftNode.vm().mount(parEl, false, true, lftSib) :
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode.el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				{ break; }
		}

//		DEBUG && console.log("from_right");
//		from_right:
		while(1) {
			if (rgtSib)
				{ var rsNode = rgtSib._node; }

			if (rgtSib && rsNode.parent != node) {
				tmpSib = prevSib(rgtSib);
				rsNode.vmid != null ? rsNode.vm().unmount(true) : removeChild(parEl, rgtSib);
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				{ break converge; }
			if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);		// rgtNode.vmid != null ? rgtNode.vm().mount(parEl, false, true, nextSib(rgtSib) :
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

//import { DEBUG } from './DEBUG';

function findDonorNode(n, nPar, oPar, fromIdx, toIdx) {		// pre-tested isView?
	var oldBody = oPar.body;

	for (var i = fromIdx || 0; i < oldBody.length; i++) {
		var o = oldBody[i];

		if (n.type == VVIEW && o.vmid != null) {			// also ignore recycled/moved?
			var ov = views[o.vmid];

			// match by key & viewFn
			if (ov.view == n.view && ov.key == n.key)
				{ return o; }
		}

		if (o.el._node != o || n.tag !== o.tag || n.type !== o.type)
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

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
function patch(vnode, donor) {
	donor.hooks && fireHooks("willRecycle", donor, vnode);

	var el = vnode.el = donor.el;

	var obody = donor.body;
	var nbody = vnode.body;

	el._node = vnode;

	// "" => ""
	if (vnode.type == TEXT && nbody !== obody) {
		el.nodeValue = nbody;
		return;
	}

	// BUG: donation would break:
	// relies on both being present?
	// div (with attrs) <-> div (no attrs)
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
			patchChildren(vnode, donor);
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
			else {
				while (el.firstChild)
					{ removeChild(el, el.firstChild); }
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', obody, nbody);	// hydrate new here?
			el.firstChild && el.removeChild(el.firstChild);
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

// [] => []
function patchChildren(vnode, donor) {
	// first unrecycled node (search head)
	var fromIdx = 0;

	var donor2, nbody = vnode.body;

	for (var i = 0; i < nbody.length; i++) {
		var node2 = nbody[i];
		var type2 = node2.type;

		if (type2 == ELEMENT || type2 == TEXT || type2 == COMMENT) {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))
				{ patch(node2, donor2); }
		}
		else if (type2 == VVIEW) {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))		// update/moveTo
				{ views[donor2.vmid]._update(node2.model, vnode, i); }		// withDOM
			else
				{ createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false); }	// createView, no dom (will be handled by sync below)
		}
		else if (type2 == VMODEL)
			{ views[node2.vmid]._update(node2.model, vnode, i); }

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex

		if (donor2) {
			if (donor2.idx == fromIdx) {							// todo: conditional contigidx (first non-null)
			//	while (obody[fromIdx] && obody[fromIdx].recycled)
				fromIdx++;
			}
		}
	}

	if (!(vnode._flags & FIXED_BODY))
		{ syncChildren(vnode); }
}

function defineText(body) {
	var node = new VNode;
	node.type = TEXT;
	node.body = body;
	return node;
}

function setRef(vm, name, node) {
	var path = ["refs"].concat(name.replace("^", "").split("."));

	deepSet(vm, path, node);

	// bubble
	var par;
	if (name[0] == "^" && (par = vm.parent()))
		{ setRef(par, name, node); }
}

// vnew, vold
function preProc(vnew, parent, idx, ownVmid, extKey) {		// , parentVm
	// injected views
	if (vnew.type === VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew.type === VVIEW) {

	}
	// injected and declared elems/text/comments
	else {
		vnew.parent = parent;
		vnew.idx = idx;
		vnew.vmid = ownVmid;

		// set external ref eg vw(MyView, data, "^moo")
		if (extKey != null && typeof extKey == "string" && extKey[0] == "^")
			{ vnew.ref = extKey; }

		if (vnew.ref != null)
			{ setRef(vnew.vm(), vnew.ref, vnew); }

		if (isArr(vnew.body)) {
		// declarative elems, comments, text nodes
			var body = vnew.body;

			for (var i = 0; i < body.length; i++) {
				var node2 = body[i];

//				if (isFunc(node2))
//					node2 = body[i] = node2();

				if (isVal(node2))
					{ body[i] = node2 = defineText(node2); }

				// remove null/undefined
				if (node2 == null)
					{ body.splice(i--, 1); }
				// flatten arrays
				else if (isArr(node2))
					{ insertArr(body, node2, i--, 1); }
				else if (node2.type === TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body === "")
						{ body.splice(i--, 1); }
					// merge with previous text node
					else if (i > 0 && body[i-1].type === TEXT) {
						body[i-1].body += node2.body;
						body.splice(i--, 1);
					}
					else
						{ preProc(node2, vnew, i); }		// , /*vnew.vm ||*/ parentVm
				}
				else {
			//		if (node2.ref != null)
			//			parentVm.setRef(node2.ref, node2);

					preProc(node2, vnew, i);			// , /*vnew.vm ||*/ parentVm
	/*
					// init/populate keys in in parent
					if (node2.key != null) {
						if (vnew.keys == null)
							vnew.keys = {};

						vnew.keys[node2.key] = i;
					}
	*/
				}
			}
		}
		else if (isStreamStub(vnew.body))
			{ vnew.body = hookStreamStub(vnew.body, vnew.vm()); }
	}
}

// global id counter
var vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
var views = {};

function ViewModel(view, model, key, opts) {			// parent, idx, parentVm
	var id = vmid++;

	var vm = this;

	vm.api = {};

	vm.id = id;
	vm.view = view;
	vm.model = model;
	vm.key = key == null ? model : key;

	var out = view.call(vm.api, vm, model, key);			// , opts

	if (isFunc(out))
		{ vm.render = out; }
	else {
		if (out.diff) {
			vm.diff(out.diff);
			delete out.diff;
		}

		assignObj(vm, out);
	}

	views[id] = vm;

	// remove this?
	if (opts) {
		vm.opts = opts;

		if (opts.hooks)
			{ vm.hook(opts.hooks); }
	//	if (opts.diff)
	//		this.diff(opts.diff);
	}

	// these must be created here since debounced per view
	vm._redrawAsync = raft(function (_) { return vm._redraw(); });
	vm._updateAsync = raft(function (newModel) { return vm._update(newModel); });

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

var ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	id: null,

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
		var p = this.node;

		while (p = p.parent) {
			if (p.vmid != null)
				{ return views[p.vmid]; }
		}

		return null;
	},

	root: function() {
		var p = this.node;

		while (p.parent)
			{ p = p.parent; }

		return views[p.vmid];
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

//	hooks: function(hooks) {},
	hook: function(hooks) {
		this.hooks = hooks;
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

/*
export function cleanExposedRefs(orefs, nrefs) {
	for (var key in orefs) {
		// ref not present in new refs
		if (nrefs == null || !(key in nrefs)) {
			var val = orefs[key];


//			var path = [];
//			// dig nown if val i a namespace
//			while (isPlainObj(val) && val.type == null) {
//				path.push(val);
//				val =
//			}


			if (isPlainObj(val)) {
				// is a vnode
				if (val.type) {
					// is an exposed ref
					if (val.ref[0] == "^") {
						console.log("clean parents of absent exposed ref");
					}
				}
				// is namespace, dig down
				else {

				}
			}
		}
	}
}
*/

function mount(el, isRoot, withDOM) {		// , asSub, refEl
	var vm = this;

	if (isRoot) {
		while (el.firstChild)
			{ el.removeChild(el.firstChild); }

		this._redraw(null, null, false);
		hydrate(this.node, el);
	}
	else {
		this._redraw(null, null, withDOM);

		if (el)
			{ insertBefore(el, this.node.el); }			// el.appendChild(this.node.el);
	}

	if (el)
		{ drainDidHooks(this); }

	return this;
}

// asSub = true means this was called from a sub-routine, so don't drain did* hook queue
// immediate = true means did* hook will not be queued (usually cause this is a promise resolution)
function unmount(asSub) {
	var vm = this;

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	delete views[vm.id];
	vm.node = node.parent = null;	// unhook to help gc?

//	vm.hooks && fireHooks("didUnmount", vm, null, immediate);

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
	if (isMounted && vm._diff != null && vm._diff()) {
		// will doing this outside of preproc cause de-opt, add shallow opt to preproc?
		if (vold && newParent) {
			newParent.body[newIdx] = vold;
			vold.parent = newParent;
		}
		return vm;
	}

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs) {
	//	var orefs = vm.refs;
		vm.refs = null;
	}


	var vnew = vm.render.call(vm.api, vm, vm.model, vm.key);		// vm.opts

//	console.log(vm.key);

	vm.node = vnew;

//	vm.node = vnew;
//	vnew.vm = vm;			// this causes a perf drop 1.53ms -> 1.62ms			how important is this?
//	vnew.vmid = vm.id;

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm.id, vm.key);
		newParent.body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold.parent) {
		preProc(vnew, vold.parent, vold.idx, vm.id, vm.key);
		vold.parent.body[vold.idx] = vnew;
	}
	else
		{ preProc(vnew, null, null, vm.id, vm.key); }

	// after preproc re-populates new refs find any exposed refs in old
	// that are not also in new and unset from all parents
	// only do for redraw roots since refs are reset at all redraw levels
//	if (isRedrawRoot && orefs)
//		cleanExposedRefs(orefs, vnew.refs);

	if (withDOM !== false) {
		if (vold) {
			// root node replacement
			if (vold.tag !== vnew.tag) {
				var parEl = vold.el.parentNode;
				var refEl = nextSib(vold.el);
				removeChild(parEl, vold.el);
				insertBefore(parEl, hydrate(vnew), refEl);
			}
			else
				{ patch(vnew, vold); }
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
	this.vmid = vm.id;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vmid: null,
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

var nano$1 = {
	ViewModel: ViewModel,
	VNode: VNode,

	createView: createView,

	defineElement: defineElement,
	defineText: defineText,
	defineComment: defineComment,
	defineView: defineView,

	injectView: injectView,
	injectElement: injectElement,

	FIXED_BODY: FIXED_BODY,
	FAST_REMOVE: FAST_REMOVE,
};

ViewModelProto._diff = null;

// @diff should be a callback that returns an array of values to shallow-compare
//   if the returned values are the same on subsequent redraw calls, then redraw() is prevented
// @diff2 may be a callback that will run if arrays dont match and recieves the old & new arrays which
//   it can then use to shallow-patch the top-level vnode if needed (like apply {display: none}) and
//   return false to prevent further redraw()
ViewModelProto.diff = function(cfg) {
	var vm = this;

	var getVals = cfg.vals;
	var thenFn = cfg.then;

	var oldVals = getVals(vm, vm.model, vm.key, vm.opts);
	var cmpFn = isArr(oldVals) ? cmpArr : cmpObj;

	vm._diff = function() {
		var newVals = getVals(vm, vm.model, vm.key, vm.opts);
		var isSame = cmpFn(oldVals, newVals);

		if (!isSame) {
			// thenFn must return false to prevent redraw
			if (thenFn != null && thenFn(vm, oldVals, newVals) === false)
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
		if (o.vmid != null)
			{ return; }

		preProc(n, o.parent, o.idx, null, null);
		o.parent.body[o.idx] = n;
//		o.parent = o.el = o.body = null;		// helps gc?
		patch(n, o);
		drainDidHooks(n.vm());
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
			oattrs.class = aclass != null && aclass != "" ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}

VNodeProto.flags = function(flags) {
	this._flags = flags;
	return this;
};

function defineElementSpread(tag) {
	var args = arguments;
	var len = args.length;
	var body, attrs;

	if (len > 1) {
		var bodyIdx = 1;

		if (isPlainObj(args[1])) {
			attrs = args[1];
			bodyIdx = 2;
		}

		if (len == bodyIdx + 1 && (isVal(args[bodyIdx]) || isArr(args[bodyIdx])))
			{ body = args[bodyIdx]; }
		else
			{ body = sliceArgs(args, bodyIdx); }
	}

	return initElementNode(tag, attrs, body);
}

// #destub: cssTag,autoPx

nano$1.defineElementSpread = defineElementSpread;

return nano$1;

})));
//# sourceMappingURL=domvm.nano.js.map
