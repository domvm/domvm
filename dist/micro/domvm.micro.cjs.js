/**
* Copyright (c) 2019, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.js (DOM ViewModel)
* A thin, fast, dependency-free vdom view layer
* @preserve https://github.com/domvm/domvm (v3.4.9-dev, micro build)
*/

'use strict';

// NOTE: if adding a new *VNode* type, make it < COMMENT and renumber rest.
// There are some places that test <= COMMENT to assert if node is a VNode

// VNode types
var UNMANAGED	= 0;
var ELEMENT	= 1;
var TEXT		= 2;
var COMMENT	= 3;

// placeholder types
var VVIEW		= 4;
var VMODEL		= 5;

var ENV_DOM = typeof window !== "undefined";

var doc = ENV_DOM ? document : {};

var emptyObj = {};

function noop() {}
var isArr = Array.isArray;

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

function sliceArgs(args, offs) {
	var arr = [];
	for (var i = offs; i < args.length; i++)
		{ arr.push(args[i]); }
	return arr;
}

function eqObj(a, b) {
	for (var i in a)
		{ if (a[i] !== b[i])
			{ return false; } }
	/* istanbul ignore next */
	return true;
}

function eqArr(a, b) {
	var alen = a.length;

	/* istanbul ignore if */
	if (b.length !== alen)
		{ return false; }

	for (var i = 0; i < alen; i++)
		{ if (a[i] !== b[i])
			{ return false; } }

	return true;
}

function eq(o, n) {
	return (
		o === n ? true :						// eqv
		n == null || o == null ? false :		// null & undefined
		isArr(o) ? eqArr(o, n) :				// assumes n is also Array
		isPlainObj(o) ? eqObj(o, n) :			// assumes n is also Object
		false
	);
}

function curry(fn, args, ctx) {
	return function() {
		return fn.apply(ctx, args);
	};
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
// impl borrowed from https://github.com/ivijs/ivi
function longestIncreasingSubsequence(a) {
	var p = a.slice();
	var result = [];
	result[0] = 0;
	var n = 0;
	var u;
	var v;
	var j;

	for (var i = 0; i < a.length; ++i) {
		var k = a[i];
//		if (k > -1) {
			j = result[n];
			if (a[j] < k) {
				p[i] = j;
				result[++n] = i;
			} else {
				u = 0;
				v = n;

				while (u < v) {
					j = (u + v) >> 1;
					if (a[result[j]] < k) {
						u = j + 1;
					} else {
						v = j;
					}
				}

				if (k < a[result[u]]) {
					if (u > 0) {
						p[i] = result[u - 1];
					}
					result[u] = i;
				}
			}
//		}
	}

	v = result[n];

	while (n >= 0) {
		result[n--] = v;
		v = p[v];
	}

	return result;
}

// based on https://github.com/Olical/binary-search
/* istanbul ignore next */
function binaryFindLarger(item, list) {
	var min = 0;
	var max = list.length - 1;
	var guess;

	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}

	return (min == list.length) ? null : min;

//	return -1;
}

function isPropAttr(name) {
	return name[0] === ".";
}

function isEvAttr(name) {
	return name[0] === "o" && name[1] === "n";
}

function isSplAttr(name) {
	return name[0] === "_";
}

function isStyleAttr(name) {
	return name === "style";
}

function repaint(node) {
	node && node.el && node.el.offsetHeight;
}

function isHydrated(vm) {
	return vm.node != null && vm.node.el != null;
}

// tests interactive props where real val should be compared
function isDynAttr(tag, attr) {
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
	ns:		null,

	el:		null,

	tag:	null,
	attrs:	null,
	body:	null,

	flags:	0,

	_diff:	null,

	// pending removal on promise resolution
	_dead:	false,
	// part of longest increasing subsequence?
	_lis:	false,

	idx:	null,
	parent:	null,
};

{
	VNodeProto._class = null;
}

function defineText(body) {
	var node = new VNode;
	node.type = TEXT;
	node.body = body;
	return node;
}

var tagCache = {};

var RE_ATTRS = /\[(\w+)(?:=([-+\w.,]+))?\]/g;

// TODO: id & class should live inside attrs?

function parseTag(raw) {
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

// (de)optimization flags

// forces slow bottom-up removeChild to fire deep willRemove/willUnmount hooks,
var DEEP_REMOVE = 1 << 0;
// prevents inserting/removing/reordering of children
var FIXED_BODY = 1 << 1;
// enables fast keyed lookup of children via binary search, expects homogeneous keyed body
var KEYED_LIST = 1 << 2;
// indicates an vnode match/diff/recycler function for body
var LAZY_LIST = 1 << 3;

function initElementNode(tag, attrs, body, flags) {
	var node = new VNode;

	node.type = ELEMENT;

	node.flags = flags || 0;

	node.attrs = attrs || null;

	{
		var parsed = parseTag(tag);

		tag = parsed.tag;

		var hasId = parsed.id != null,
			hasClass = parsed.class != null,
			hasAttrs = parsed.attrs != null;

		if (hasId || hasClass || hasAttrs) {
			var p = node.attrs || {};

			if (hasId && p.id == null)
				{ p.id = parsed.id; }

			if (hasClass) {
				{
					node._class = parsed.class;		// static class
					p.class = parsed.class + (p.class != null ? (" " + p.class) : "");
				}
			}

			if (hasAttrs) {
				for (var key in parsed.attrs)
					{ if (p[key] == null)
						{ p[key] = parsed.attrs[key]; } }
			}

			node.attrs = p;
		}
	}

	node.tag = tag;

	if (node.attrs != null) {
		var mergedAttrs = node.attrs;

		{
			if (mergedAttrs._key != null)
				{ node.key = mergedAttrs._key; }

			if (mergedAttrs._ref != null)
				{ node.ref = mergedAttrs._ref; }

			if (mergedAttrs._hooks != null)
				{ node.hooks = mergedAttrs._hooks; }

			if (mergedAttrs._data != null)
				{ node.data = mergedAttrs._data; }

			if (mergedAttrs._flags != null)
				{ node.flags = mergedAttrs._flags; }
		}

		{
			if (node.key == null) {
				if (node.ref != null)
					{ node.key = node.ref; }
				else if (mergedAttrs.id != null)
					{ node.key = mergedAttrs.id; }
				else if (mergedAttrs.name != null)
					{ node.key = mergedAttrs.name + (mergedAttrs.type === "radio" || mergedAttrs.type === "checkbox" ? mergedAttrs.value : ""); }
			}
		}
	}

	if (body != null) {
		node.body = body;

		// replace rather than append flags since lists should not have
		// FIXED_BODY, and DEEP_REMOVE is appended later in preProc
		if (body instanceof List)
			{ node.flags = body.flags; }
	}

	return node;
}

function List(items, diff, key) {
	var self = this, tpl;

	var len = items.length;

	self.flags = LAZY_LIST;

	self.items = items;

	self.length = len;

	self.key = function (i) { return null; };

	self.diff = {
		val: function(i, newParent) {
			return diff.val(items[i], newParent);
		},
		eq: function(i, donor) {
			return diff.eq(donor._diff, self.diff.val(i));
		}
	};

	// TODO: auto-import diff and keygen into some vtypes?
	self.tpl = function (i) { return tpl(items[i], i); };

	self.map = function (tpl0) {
		tpl = tpl0;
		return self;
	};

	self.body = function(vnode) {
		var nbody = [];

		for (var i = 0; i < len; i++) {
			var vnode2 = self.tpl(i);

		//	if ((vnode.flags & KEYED_LIST) === KEYED_LIST && self. != null)
		//		vnode2.key = getKey(item);

			if (vnode2.type != VVIEW)
				{ vnode2._diff = self.diff.val(i, vnode); }

			nbody.push(vnode2);
		}

		// replace List with generated body
		vnode.body = nbody;

		preProcBody(vnode);
	};

	if (key != null) {
		self.flags |= KEYED_LIST;
		self.key = function (i) { return key(items[i], i); };
	}

	{
		if (isFunc(diff)) {
			self.diff = {
				val: function(i) {
					return diff(items[i]);
				},
				eq: function(i, donor) {
					var o = donor._diff,
						n = self.diff.val(i);

					return eq(o, n);
				}
			};
		}
	}
}

function list(items, diff, key) {
	return new List(items, diff, key);
}

function setRef(vm, name, node) {
	var path = ("refs." + name).split(".");
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

	var nh = vnew.hooks,
		vh = ownVm && ownVm.hooks;

	if (nh && (nh.willRemove || nh.didRemove) ||
		vh && (vh.willUnmount || vh.didUnmount))
		{ setDeepRemove(vnew); }

	if (isArr(vnew.body))
		{ preProcBody(vnew); }
	else if (vnew.body === "")
		{ vnew.body = null; }
	else {

		if (vnew.body != null && !(vnew.body instanceof List))
			{ vnew.body = "" + vnew.body; }
	}
}

function preProcBody(vnew) {
	var body = vnew.body;

	for (var i = 0; i < body.length; i++) {
		var node2 = body[i];

		// remove false/null/undefined
		if (node2 === false || node2 == null)
			{ body.splice(i--, 1); }
		// flatten arrays
		else if (isArr(node2)) {
			insertArr(body, node2, i--, 1);
		}
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

var unitlessProps = {
	animationIterationCount: true,
	boxFlex: true,
	boxFlexGroup: true,
	boxOrdinalGroup: true,
	columnCount: true,
	flex: true,
	flexGrow: true,
	flexPositive: true,
	flexShrink: true,
	flexNegative: true,
	flexOrder: true,
	gridRow: true,
	gridColumn: true,
	order: true,
	lineClamp: true,

	borderImageOutset: true,
	borderImageSlice: true,
	borderImageWidth: true,
	fontWeight: true,
	lineHeight: true,
	opacity: true,
	orphans: true,
	tabSize: true,
	widows: true,
	zIndex: true,
	zoom: true,

	fillOpacity: true,
	floodOpacity: true,
	stopOpacity: true,
	strokeDasharray: true,
	strokeDashoffset: true,
	strokeMiterlimit: true,
	strokeOpacity: true,
	strokeWidth: true
};

function autoPx(name, val) {
	{
		// typeof val === 'number' is faster but fails for numeric strings
		return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
	}
}

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

var onemit = {};

function emitCfg(cfg) {
	assignObj(onemit, cfg);
}

function emit(evName) {
	var targ = this,
		src = targ;

	var args = sliceArgs(arguments, 1).concat(src, src.data);

	do {
		var evs = targ.onemit;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(targ, args);
			break;
		}
	} while (targ = targ.parent());

	if (onemit[evName])
		{ onemit[evName].apply(targ, args); }
}

var onevent = noop;
var syncRedraw = false;
var didRedraws = noop;

function config(newCfg) {
	{
		onevent = newCfg.onevent || onevent;
	}

	if (newCfg.syncRedraw != null)
		{ syncRedraw = newCfg.syncRedraw; }

	if (newCfg.didRedraws != null)
		{ didRedraws = newCfg.didRedraws; }

	{
		if (newCfg.onemit)
			{ emitCfg(newCfg.onemit); }
	}
}

var registry = {};

function listen(ontype) {
	if (registry[ontype]) { return; }
	registry[ontype] = true;
	bind(doc, ontype, handle, true);
}

/*
function unlisten(ontype) {
	if (registry[ontype])
		doc.removeEventListener(ontype.slice(2), handle, USE_CAPTURE);
}
*/

function unbind(el, type, fn, capt) {
	el.removeEventListener(type.slice(2), fn, capt);
}

function bind(el, type, fn, capt) {
	el.addEventListener(type.slice(2), fn, capt);
}

function exec(fn, args, e, node, vm) {
	var out1 = fn.apply(vm, args.concat([e, node, vm, vm.data])), out2, out3;

	{
		out2 = vm.onevent(e, node, vm, vm.data, args),
		out3 = onevent.call(null, e, node, vm, vm.data, args);
	}

	if (out1 === false || out2 === false || out3 === false) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
}

function ancestEvDefs(type, node) {
	var ontype = "on" + type, evDef, attrs, evDefs = [];

	while (node) {
		if (attrs = node.attrs) {
			if ((evDef = attrs[ontype]) && isArr(evDef))
				{ evDefs.unshift(evDef); }
		}
		node = node.parent;
	}

	return evDefs;
}

function handle(e) {
	var node = e.target._node;

	if (node == null)
		{ return; }

	var evDefs = ancestEvDefs(e.type, node);

	var vm = getVm(node);

	for (var i = 0; i < evDefs.length; i++) {
		var res = exec(evDefs[i][0], evDefs[i].slice(1), e, node, vm);

		if (res === false)
			{ break; }
	}
}

function patchEvent(node, name, nval, oval) {
	if (nval == oval)
		{ return; }

	var el = node.el;

	if (isFunc(nval))
		{ bind(el, name, nval, false); }
	else if (nval != null)
		{ listen(name); }

	if (isFunc(oval))
		{ unbind(el, name, oval, false); }
}

function remAttr(node, name, asProp) {
	if (isPropAttr(name)) {
		name = name.substr(1);
		asProp = true;
	}

	if (asProp)
		{ node.el[name] = ""; }
	else
		{ node.el.removeAttribute(name); }
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
function setAttr(node, name, val, asProp, initial) {
	var el = node.el;

	if (node.ns != null)
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

function patchAttrs(vnode, donor, initial) {
	var nattrs = vnode.attrs || emptyObj;
	var oattrs = donor.attrs || emptyObj;

	if (nattrs === oattrs) ;
	else {
		for (var key in nattrs) {
			var nval = nattrs[key];

			if (nval == null)
				{ continue; }

			var isDyn = isDynAttr(vnode.tag, key);
			var oval = isDyn ? vnode.el[key] : oattrs[key];

			if (nval === oval) ;
			else if (isStyleAttr(key))
				{ patchStyle(vnode, donor); }
			else if (isSplAttr(key)) ;
			else if (isEvAttr(key))
				{ patchEvent(vnode, key, nval, oval); }
			else
				{ setAttr(vnode, key, nval, isDyn, initial); }
		}

		// TODO: bench style.cssText = "" vs removeAttribute("style")
		for (var key in oattrs) {
			if (nattrs[key] == null) {
				if (isEvAttr(key))
					{ patchEvent(vnode, key, nattrs[key], oattrs[key]); }
				else if (!isSplAttr(key))
					{ remAttr(vnode, key, isDynAttr(vnode.tag, key)); }
			}
		}
	}
}

function createView(view, data, key, opts) {
	if (view.type === VVIEW) {
		data	= view.data;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	return new ViewModel(view, data, key, opts);
}

var didQueue = [];

function fireHook(hooks, name, o, n, immediate) {
	if (hooks != null) {
		var fn = o.hooks[name];

		if (fn) {
			if (name[0] === "d" && name[1] === "i" && name[2] === "d") {	// did*
				//	console.log(name + " should queue till repaint", o, n);
				if (immediate) {
					repaint(o.parent);
					fn(o, n);
				}
				else
					{ didQueue.push([fn, o, n]); }
			}
			else {		// will*
				//	console.log(name + " may delay by promise", o, n);
				return fn(o, n);		// or pass  done() resolver
			}
		}
	}
}

function drainDidHooks(vm, doRepaint) {
	if (didQueue.length) {
		doRepaint && repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			{ item[0](item[1], item[2]); }
	}
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
	var vm = node.vm;

	var wuRes = vm != null && fireHook(vm.hooks, "willUnmount", vm, vm.data);

	var wrRes = fireHook(node.hooks, "willRemove", node);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE && isArr(node.body)) {
		for (var i = 0; i < node.body.length; i++)
			{ deepNotifyRemove(node.body[i]); }
	}

	return wuRes || wrRes;
}

function deepUnref(node, self) {
	if (self) {
		var vm = node.vm;

		if (vm != null)
			{ vm.node = vm.refs = null; }
	}

	var obody = node.body;

	if (isArr(obody)) {
		for (var i = 0; i < obody.length; i++)
			{ deepUnref(obody[i], true); }
	}
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, vm = node.vm;

	deepUnref(node, true);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE) {
		for (var i = 0; i < node.body.length; i++)
			{ _removeChild(el, node.body[i].el); }
	}

	delete el._node;

	parEl.removeChild(el);

	fireHook(node.hooks, "didRemove", node, null, immediate);

	if (vm != null) {
		fireHook(vm.hooks, "didUnmount", vm, vm.data, immediate);
		vm.node = null;
	}
}

// todo: should delay parent unmount() by returning res prom?
function removeChild(parEl, el) {
	var node = el._node;

	// already marked for removal
	if (node._dead) { return; }

	var res = deepNotifyRemove(node);

	if (res != null && isProm(res)) {
		node._dead = true;
		res.then(curry(_removeChild, [parEl, el, true]));
	}
	else
		{ _removeChild(parEl, el); }
}

function clearChildren(parent) {
	var parEl = parent.el;

	if ((parent.flags & DEEP_REMOVE) === 0) {
		deepUnref(parent, false);
		parEl.textContent = null;
	}
	else {
		var el = parEl.firstChild;

		if (el != null) {
			do {
				var next = nextSib(el);
				removeChild(parEl, el);
			} while (el = next);
		}
	}
}

// todo: hooks
function insertBefore(parEl, el, refEl) {
	var node = el._node, inDom = el.parentNode != null;

	// el === refEl is asserted as a no-op insert called to fire hooks
	var vm = (el === refEl || !inDom) ? node.vm : null;

	if (vm != null)
		{ fireHook(vm.hooks, "willMount", vm, vm.data); }

	fireHook(node.hooks, inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	fireHook(node.hooks, inDom ? "didReinsert" : "didInsert", node);

	if (vm != null)
		{ fireHook(vm.hooks, "didMount", vm, vm.data); }
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}

function hydrateBody(vnode) {
	for (var i = 0; i < vnode.body.length; i++) {
		var vnode2 = vnode.body[i];
		var type2 = vnode2.type;

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT)
			{ insertBefore(vnode.el, hydrate(vnode2)); }		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 === VVIEW) {
			var vm = createView(vnode2.view, vnode2.data, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new data updates
			type2 = vm.node.type;
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 === VMODEL) {
			var vm = vnode2.vm;
			vm._update(vnode2.data, vnode, i, true, true);
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
				{ patchAttrs(vnode, emptyObj, true); }

			if ((vnode.flags & LAZY_LIST) === LAZY_LIST)	// vnode.body instanceof LazyList
				{ vnode.body.body(vnode); }

			if (isArr(vnode.body))
				{ hydrateBody(vnode); }
			else if (vnode.body != null)
				{ vnode.el.textContent = vnode.body; }
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

var BREAK = 1;
var BREAK_ALL = 2;

function syncDir(advSib, advNode, insert, sibName, nodeName, invSibName, invNodeName, invInsert) {
	return function(node, parEl, body, state, convTest, lis) {
		var sibNode, tmpSib;

		if (state[sibName] != null) {
			sibNode = state[sibName]._node;

			{
				// skip dom elements not created by domvm
				if (sibNode == null) {

					state[sibName] = advSib(state[sibName]);
					return;
				}
			}

			if (parentNode(sibNode) !== node) {
				tmpSib = advSib(state[sibName]);
				sibNode.vm != null ? sibNode.vm.unmount(true) : removeChild(parEl, state[sibName]);
				state[sibName] = tmpSib;
				return;
			}
		}

		if (state[nodeName] == convTest)
			{ return BREAK_ALL; }
		else if (state[nodeName].el == null) {
			insert(parEl, hydrate(state[nodeName]), state[sibName]);	// should lis be updated here?
			state[nodeName] = advNode(state[nodeName], body);		// also need to advance sib?
		}
		else if (state[nodeName].el === state[sibName]) {
			state[nodeName] = advNode(state[nodeName], body);
			state[sibName] = advSib(state[sibName]);
		}
		// head->tail or tail->head
		else if (!lis && sibNode === state[invNodeName]) {
			tmpSib = state[sibName];
			state[sibName] = advSib(tmpSib);
			invInsert(parEl, tmpSib, state[invSibName]);
			state[invSibName] = tmpSib;
		}
		else {

			if (lis && state[sibName] != null)
				{ return lisMove(advSib, advNode, insert, sibName, nodeName, parEl, body, sibNode, state); }

			return BREAK;
		}
	};
}

/** @noinline */
function lisMove(advSib, advNode, insert, sibName, nodeName, parEl, body, sibNode, state) {
	if (sibNode._lis) {
		insert(parEl, state[nodeName].el, state[sibName]);
		state[nodeName] = advNode(state[nodeName], body);
	}
	else {
		// find closest tomb
		var t = binaryFindLarger(sibNode.idx, state.tombs);
		sibNode._lis = true;
		var tmpSib = advSib(state[sibName]);
		insert(parEl, state[sibName], t != null ? body[state.tombs[t]].el : t);

		if (t == null)
			{ state.tombs.push(sibNode.idx); }
		else
			{ state.tombs.splice(t, 0, sibNode.idx); }

		state[sibName] = tmpSib;
	}
}

var syncLft = syncDir(nextSib, nextNode, insertBefore, "lftSib", "lftNode", "rgtSib", "rgtNode", insertAfter);
var syncRgt = syncDir(prevSib, prevNode, insertAfter, "rgtSib", "rgtNode", "lftSib", "lftNode", insertBefore);

function syncChildren(node, donor) {
	var obody	= donor.body,
		parEl	= node.el,
		body	= node.body,
		state = {
			lftNode:	body[0],
			rgtNode:	body[body.length - 1],
			lftSib:		((obody)[0] || emptyObj).el,
			rgtSib:		(obody[obody.length - 1] || emptyObj).el,
		};

	converge:
	while (1) {
//		from_left:
		while (1) {
			var l = syncLft(node, parEl, body, state, null, false);
			if (l === BREAK) { break; }
			if (l === BREAK_ALL) { break converge; }
		}

//		from_right:
		while (1) {
			var r = syncRgt(node, parEl, body, state, state.lftNode, false);
			if (r === BREAK) { break; }
			if (r === BREAK_ALL) { break converge; }
		}

		sortDOM(node, parEl, body, state);
		break;
	}
}

// TODO: also use the state.rgtSib and state.rgtNode bounds, plus reduce LIS range
function sortDOM(node, parEl, body, state) {
	var domIdxs = [];

	var el = parEl.firstChild;

	// array of new vnode idices in current (old) dom order
	do  {
		var n = el._node;
		if (n.parent === node)
			{ domIdxs.push(n.idx); }
	} while (el = nextSib(el));

	// list of non-movable vnode indices (already in correct order in old dom)
	var tombs = longestIncreasingSubsequence(domIdxs).map(function (i) { return domIdxs[i]; });

	for (var i = 0; i < tombs.length; i++)
		{ body[tombs[i]]._lis = true; }

	state.tombs = tombs;

	while (1) {
		var r = syncLft(node, parEl, body, state, null, true);
		if (r === BREAK_ALL) { break; }
	}
}

function alreadyAdopted(vnode) {
	return vnode.el._node.parent !== vnode.parent;
}

function takeSeqIndex(n, obody, fromIdx) {
	return obody[fromIdx];
}

function findSeqThorough(n, obody, fromIdx) {		// pre-tested isView?
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (o.vm != null) {
			// match by key & viewFn || vm
			if (n.type === VVIEW && o.vm.view === n.view && o.vm.key === n.key || n.type === VMODEL && o.vm === n.vm)
				{ return o; }
		}
		else if (!alreadyAdopted(o) && n.tag === o.tag && n.type === o.type && n.key === o.key && (n.flags & ~DEEP_REMOVE) === (o.flags & ~DEEP_REMOVE))
			{ return o; }
	}

	return null;
}

function findKeyed(n, obody, fromIdx) {
	if (obody._keys == null) {
		if (obody[fromIdx].key === n.key)
			{ return obody[fromIdx]; }
		else {
			var keys = {};
			for (var i = 0; i < obody.length; i++)
				{ keys[obody[i].key] = i; }
			obody._keys = keys;
		}
	}

	return obody[obody._keys[n.key]];
}

/*
// list must be a sorted list of vnodes by key
function findBinKeyed(n, list) {
	var idx = binaryKeySearch(list, n.key);
	return idx > -1 ? list[idx] : null;
}
*/

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
function patch(vnode, donor) {
	fireHook(donor.hooks, "willRecycle", donor, vnode);

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
		{ patchAttrs(vnode, donor, false); }

	// patch events

	var oldIsArr = isArr(obody);
	var newIsArr = isArr(nbody);
	var lazyList = (vnode.flags & LAZY_LIST) === LAZY_LIST;

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr || lazyList)
			{ patchChildren(vnode, donor); }
		// [] => "" | null
		else if (nbody !== obody) {
			if (nbody != null)
				{ el.textContent = nbody; }
			else
				{ clearChildren(donor); }
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
			clearChildren(donor);
			hydrateBody(vnode);
		}
		// "" | null => "" | null
		else if (nbody !== obody) {
			if (nbody != null && obody != null)
				{ el.firstChild.nodeValue = nbody; }
			else
				{ el.textContent = nbody; }
		}
	}

	fireHook(donor.hooks, "didRecycle", donor, vnode);
}

// larger qtys of KEYED_LIST children will use binary search
//const SEQ_FAILS_MAX = 100;

// TODO: modify vtree matcher to work similar to dom reconciler for keyed from left -> from right -> head/tail -> binary
// fall back to binary if after failing nri - nli > SEQ_FAILS_MAX
// while-advance non-keyed fromIdx
// [] => []
function patchChildren(vnode, donor) {
	var nbody		= vnode.body,
		nlen		= nbody.length,
		obody		= donor.body,
		olen		= obody.length,
		isLazy		= (vnode.flags & LAZY_LIST) === LAZY_LIST,
		isFixed		= (vnode.flags & FIXED_BODY) === FIXED_BODY,
		isKeyed		= (vnode.flags & KEYED_LIST) === KEYED_LIST,
		domSync		= !isFixed && vnode.type === ELEMENT,
		doFind		= true,
		find		= (
			olen === 0 ? noop :
			isKeyed ? findKeyed :					// keyed lists/lazyLists
			isFixed || isLazy ? takeSeqIndex :		// unkeyed lazyLists and FIXED_BODY
			findSeqThorough							// more complex stuff
		);

	if (domSync && nlen === 0) {
		clearChildren(donor);
		if (isLazy)
			{ vnode.body = []; }	// nbody.tpl(all);
		return;
	}

	var donor2,
		node2,
		foundIdx,
		patched = 0,
		everNonseq = false,
		fromIdx = 0;		// first unrecycled node (search head)

	if (isLazy) {
		var fnode2 = {key: null};
		var nbodyNew = vnode.body = Array(nlen);
	}

	for (var i = 0; i < nlen; i++) {
		if (isLazy) {
			var remake = false;

			if (doFind) {
				if (isKeyed)
					{ fnode2.key = nbody.key(i); }

				donor2 = find(fnode2, obody, fromIdx);
			}

			if (donor2 != null) {
                foundIdx = donor2.idx;

				if (nbody.diff.eq(i, donor2)) {
					// almost same as reParent() in ViewModel
					node2 = donor2;
					node2.parent = vnode;
					node2.idx = i;
					node2._lis = false;
				}
				else
					{ remake = true; }
			}
			else
				{ remake = true; }

			if (remake) {
				node2 = nbody.tpl(i);			// what if this is a VVIEW, VMODEL, injected element?

				if (node2.type === VVIEW) {
					if (donor2 != null)
						{ node2 = donor2.vm._update(node2.data, vnode, i, true, true).node; }
					else
						{ node2 = createView(node2.view, node2.data, node2.key, node2.opts)._redraw(vnode, i, false).node; }
				}
				else {
					preProc(node2, vnode, i);

					node2._diff = nbody.diff.val(i, vnode);

					if (donor2 != null)
						{ patch(node2, donor2); }
				}
			}

			nbodyNew[i] = node2;
		}
		else {
			var node2 = nbody[i];
			var type2 = node2.type;

			// ELEMENT,TEXT,COMMENT
			if (type2 <= COMMENT) {
				if (donor2 = doFind && find(node2, obody, fromIdx)) {
					patch(node2, donor2);
					foundIdx = donor2.idx;
				}
			}
			else if (type2 === VVIEW) {
				if (donor2 = doFind && find(node2, obody, fromIdx)) {		// update/moveTo
					foundIdx = donor2.idx;
					donor2.vm._update(node2.data, vnode, i, true, true);
				}
				else
					{ createView(node2.view, node2.data, node2.key, node2.opts)._redraw(vnode, i, false); }	// createView, no dom (will be handled by sync below)
			}
			else if (type2 === VMODEL) {
				var vm = node2.vm;

				// if the injected vm has never been rendered, this vm._update() serves as the
				// initial vtree creator, but must avoid hydrating (creating .el) because syncChildren()
				// which is responsible for mounting below (and optionally hydrating), tests .el presence
				// to determine if hydration & mounting are needed
				var hasDOM = isHydrated(vm);

				// injected vm existed in another sub-tree / dom parent
				// (not ideal to unmount here, but faster and less code than
				// delegating to dom reconciler)
				if (hasDOM && vm.node.parent != donor) {
					vm.unmount(true);
					hasDOM = false;
				}

				vm._update(node2.data, vnode, i, hasDOM, true);
			}
		}

		// found donor & during a sequential search ...at search head
		if (donor2 != null) {
			if (foundIdx === fromIdx) {
				// advance head
				fromIdx++;
				// if all old vnodes adopted and more exist, stop searching
				if (fromIdx === olen && nlen > olen) {
					// short-circuit find, allow loop just create/init rest
					donor2 = null;
					doFind = false;
				}
			}
			else
				{ everNonseq = true; }

			if (!isKeyed && olen > 100 && everNonseq && ++patched % 10 === 0)
				{ while (fromIdx < olen && alreadyAdopted(obody[fromIdx]))
					{ fromIdx++; } }
		}
	}

	domSync && syncChildren(vnode, donor);
}

//if (true) {
	var redrawQueue = new Set();
	var rafId = 0;

	function drainQueue() {
		redrawQueue.forEach(function (vm) {
			// don't redraw if vm was unmounted
			if (vm.node == null)
				{ return; }

			// don't redraw if an ancestor is also enqueued
			var parVm = vm;
			while (parVm = parVm.parent()) {
				if (redrawQueue.has(parVm))
					{ return; }
			}

			vm.redraw(true);
		});

		didRedraws(redrawQueue);
		redrawQueue.clear();
		rafId = 0;
	}

// view + key serve as the vm's unique identity
function ViewModel(view, data, key, opts) {
	var vm = this;

	vm.view = view;
	vm.data = data;
	vm.key = key;

	if (opts) {
		vm.opts = opts;
		vm.cfg(opts);
	}

	var out = isPlainObj(view) ? view : view.call(vm, vm, data, key, opts);

	if (isFunc(out))
		{ vm.render = out; }
	else {
		vm.render = out.render;
		vm.cfg(out);
	}

	vm.init && vm.init.call(vm, vm, vm.data, vm.key, opts);
}

function dfltEq(vm, o, n) {
	return eq(o, n);
}

function cfg(opts) {
	var t = this;

	if (opts.init)
		{ t.init = opts.init; }
	if (opts.diff) {
		if (isFunc(opts.diff)) {
			t.diff = {
				val: opts.diff,
				eq: dfltEq,
			};
		}
		else
			{ t.diff = opts.diff; }
	}

	{
		if (opts.onevent)
			{ t.onevent = opts.onevent; }
	}

	// maybe invert assignment order?
	if (opts.hooks)
		{ t.hooks = assignObj(t.hooks || {}, opts.hooks); }

	{
		if (opts.onemit)
			{ t.onemit = assignObj(t.onemit || {}, opts.onemit); }
	}
}

var ViewModelProto = ViewModel.prototype = {
	constructor: ViewModel,

	init:	null,
	view:	null,
	key:	null,
	data:	null,
	state:	null,
	api:	null,
	opts:	null,
	node:	null,
	hooks:	null,
	refs:	null,
	render:	null,

	mount: mount,
	unmount: unmount,
	cfg: cfg,
	config: cfg,
	parent: function() {
		return getVm(this.node.parent);
	},
	root: function() {
		var p = this.node;

		while (p.parent)
			{ p = p.parent; }

		return p.vm;
	},
	redraw: function(sync) {
		var vm = this;

		{
			if (sync == null)
				{ sync = syncRedraw; }

			if (sync)
				{ vm._redraw(null, null, isHydrated(vm)); }
			else {
				redrawQueue.add(vm);

				if (rafId === 0)
					{ rafId = requestAnimationFrame(drainQueue); }
			}
		}

		return vm;
	},
	update: function(newData, sync) {
		var vm = this;

		{
			if (sync == null)
				{ sync = syncRedraw; }

			vm._update(newData, null, null, isHydrated(vm), sync);

			if (!sync)
				{ vm.redraw(); }
		}

		return vm;
	},

	_update: updateSync,
	_redraw: redrawSync,
};

{
	ViewModelProto.onevent = noop;
}

function mount(el, isRoot) {
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
			{ insertBefore(el, vm.node.el); }
	}

	if (el)
		{ drainDidHooks(vm, true); }

	return vm;
}

// asSub means this was called from a sub-routine, so don't drain did* hook queue
function unmount(asSub) {
	var vm = this;

	var node = vm.node;
	var parEl = node.el.parentNode;

	// edge bug: this could also be willRemove promise-delayed; should .then() or something to make sure hooks fire in order
	removeChild(parEl, node.el);

	node.el = null;

	if (!asSub)
		{ drainDidHooks(vm, true); }
}

function reParent(vm, vold, newParent, newIdx) {
	if (newParent != null) {
		newParent.body[newIdx] = vold;
		vold.idx = newIdx;
		vold.parent = newParent;
		vold._lis = false;
	}
	return vm;
}

function redrawSync(newParent, newIdx, withDOM) {
	var isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

	var doDiff = vm.diff != null,
		vold = vm.node,
		oldDiff,
		newDiff;

	if (doDiff) {
		newDiff = vm.diff.val(vm, vm.data, vm.key, newParent, newIdx);

		if (vold != null) {
			oldDiff = vold._diff;
			if (vm.diff.eq(vm, oldDiff, newDiff)) {
				vold._diff = newDiff;
				return reParent(vm, vold, newParent, newIdx);
			}
		}
	}

	isMounted && fireHook(vm.hooks, "willRedraw", vm, vm.data);

	var vnew = vm.render.call(vm, vm, vm.data, vm.key, newParent, newIdx);

	if (doDiff)
		{ vnew._diff = newDiff; }

	if (vnew === vold)
		{ return reParent(vm, vold, newParent, newIdx); }

	// todo: test result of willRedraw hooks before clearing refs
	vm.refs = null;

	// always assign vm key to root vnode (this is a de-opt)
	if (vm.key != null && vnew.key !== vm.key)
		{ vnew.key = vm.key; }

	vm.node = vnew;

	if (newParent) {
		preProc(vnew, newParent, newIdx, vm);
		newParent.body[newIdx] = vnew;
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
			if (vold.tag !== vnew.tag || vold.key !== vnew.key) {
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
				{ patch(vnew, vold); }
		}
		else
			{ hydrate(vnew); }
	}

	isMounted && fireHook(vm.hooks, "didRedraw", vm, vm.data);

	if (isRedrawRoot && isMounted)
		{ drainDidHooks(vm, true); }

	return vm;
}

// this also doubles as moveTo
function updateSync(newData, newParent, newIdx, withDOM, withRedraw) {
	var vm = this;

	if (newData != null) {
		if (vm.data !== newData) {
			fireHook(vm.hooks, "willUpdate", vm, newData);
			vm.data = newData;
		}
	}

	return withRedraw ? vm._redraw(newParent, newIdx, withDOM) : vm;
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
function VView(view, data, key, opts) {
	this.view = view;
	this.data = data;
	this.key = key;
	this.opts = opts;
}

VView.prototype = {
	constructor: VView,

	type: VVIEW,
	view: null,
	data: null,
	key: null,
	opts: null,
};

function defineView(view, data, key, opts) {
	return new VView(view, data, key, opts);
}

// placeholder for injected ViewModels
function VModel(vm, data) {
	this.vm = vm;
	this.data = data;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vm: null,
	data: null,
};

function injectView(vm, data) {
	return new VModel(vm, data);
}

function injectElement(el) {
	var node = new VNode;
	node.type = UNMANAGED;
	node.el = node.key = el;
	return node;
}

function protoPatch(n, doRepaint) {
	patch$1(this, n, doRepaint);
}

// newNode can be either {class: style: } or full new VNode
// will/didPatch hooks?
function patch$1(o, n, doRepaint) {
	// patch attrs obj
	if (isPlainObj(n)) {
		// TODO: re-establish refs

		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);

		{
			// prepend any fixed shorthand class
			if (n.class != null && o._class != null)
				{ n.class = o._class + " " + n.class; }
		}

		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, n);

		patchAttrs(o, donor);

		doRepaint && repaint(o);
	}
	// patch full vnode
	else {
		// no full patching of view roots, just use redraw!
		if (o.vm != null)
			{ return; }

		preProc(n, o.parent, o.idx, null);
		o.parent.body[o.idx] = n;
		patch(n, o);
		doRepaint && repaint(n);
		drainDidHooks(getVm(n), false);
	}
}

VNodeProto.patch = protoPatch;

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

		if (len === bodyIdx + 1 && !(args[bodyIdx] instanceof VNode) && !(args[bodyIdx] instanceof VView) && !(args[bodyIdx] instanceof VModel))
			{ body = args[bodyIdx]; }
		else
			{ body = sliceArgs(args, bodyIdx); }
	}

	return initElementNode(tag, attrs, body);
}

function defineSvgElementSpread() {
	var n = defineElementSpread.apply(null, arguments);
	n.ns = SVG_NS;
	return n;
}

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

ViewModelProto.emit = emit;
ViewModelProto.onemit = null;
ViewModelProto.body = function() {
	return nextSubVms(this.node, []);
};

exports.defineElementSpread = defineElementSpread;
exports.defineSvgElementSpread = defineSvgElementSpread;
exports.ViewModel = ViewModel;
exports.VNode = VNode;
exports.createView = createView;
exports.defineElement = defineElement;
exports.defineSvgElement = defineSvgElement;
exports.defineText = defineText;
exports.defineComment = defineComment;
exports.defineView = defineView;
exports.injectView = injectView;
exports.injectElement = injectElement;
exports.list = list;
exports.FIXED_BODY = FIXED_BODY;
exports.KEYED_LIST = KEYED_LIST;
exports.config = config;
exports.cfg = config;
