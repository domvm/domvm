(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.domvm = global.domvm || {})));
}(this, (function (exports) { 'use strict';

var VTYPE = {
	ELEMENT:	1,
	TEXT:		2,
	COMMENT:	3,
	// placeholder nodes
	VVIEW:		4,
	VMODEL:		5,
};

function startsWith(haystack, needle) {
	return haystack.lastIndexOf(needle, 0) === 0;
}

function isUndef(val) {
	return typeof val == "undefined";
}

function isArr(val) {
	return Array.isArray(val);
}

function isObj(val) {
	return val != null && typeof val == "object" && !isArr(val);
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

function deepSet(targ, path, val) {
	var seg;

	while (seg = path.shift()) {
		if (path.length == 0)
			{ targ[seg] = val; }
		else
			{ targ[seg] = targ = targ[seg] || {}; }
	}
}

function sliceArgs(args, offs) {
	return Array.prototype.slice.call(args, offs || 0)
}

/*
export function cmpArr(a, b) {
	const alen = a.length;

	if (b.length != alen)
		return false;

	for (var i = 0; i < alen; i++)
		if (a[i] !== b[i])
			return false;

	return true;
}
*/

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

function camelDash(val) {
	return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function styleStr(css) {
	var style = "";

	for (var pname in css) {
		if (css[pname] !== null)
			{ style += camelDash(pname) + ": " + autoPx(pname, css[pname]) + '; '; }
	}

	return style;
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

function remAttr(node, name) {
	node.el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
function setAttr(node, name, val) {
	var el = node.el;

	if (val == null)
		{ remAttr(node, name); }		// will also removeAttr of style: null
	else if (name == "class")
		{ el.className = val; }
	else if (name == "id")
		{ el.id = val; }
	else if (name[0] == ".")
		{ el[name.substr(1)] = val; }
	// todo: diff style? bench individual prop style setting, vs cssText
	else if (typeof val == "boolean")		// name === "type" ||
		{ el[name] = val; }
	else
		{ el.setAttribute(name, val); }
}

// global id counter
var vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
var views = {};

function createView(view, model, key, opts) {
	if (view.type == VTYPE.VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	return new ViewModel(vmid++, view, model, key, opts);
}

/*
import { patchAttrs2 } from './patch';
import { VNode } from './VNode';
const fakeDonor = new VNode(VTYPE.ELEMENT);
fakeDonor.attrs = {};
*/

// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];

		if (isStyleProp(key))
			{ patchStyle(vnode); }
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			{ patchEvent(vnode, key.substr(2), null, nval); }
		else if (nval != null)
			{ setAttr(vnode, key, nval); }
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
function hydrate(vnode, withEl) {
	if (vnode.el == null) {
		if (vnode.type === VTYPE.ELEMENT) {
			vnode.el = withEl || document.createElement(vnode.tag);

			if (vnode.attrs)
				{ patchAttrs2(vnode); }

			if (isArr(vnode.body)) {
				vnode.body.forEach(function (vnode2, i) {
					if (vnode2.type == VTYPE.VMODEL) {
						var vm = views[vnode2.vmid];
						vm._redraw(vnode, i);
						insertBefore(vnode.el, vm.node.el);
					}
					else if (vnode2.type == VTYPE.VVIEW) {
						var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i);		// todo: handle new model updates
						insertBefore(vnode.el, vm.node.el);
					}
					else
						{ insertBefore(vnode.el, hydrate(vnode2)); }		// vnode.el.appendChild(hydrate(vnode2))
				});
			}
			else if (vnode.body != null && vnode.body !== "") {
				if (vnode.html)
					{ vnode.el.innerHTML = vnode.body; }
				else
					{ vnode.el.textContent = vnode.body; }
			}
		}
		else if (vnode.type === VTYPE.TEXT)
			{ vnode.el = withEl || document.createTextNode(vnode.body); }
	}

	vnode.el._node = vnode;

	return vnode.el;
}

//import { DEBUG } from './DEBUG';

var didQueue = [];

function fireHook(did, fn, o, n, then) {
	if (did) {	// did*
		//	console.log(name + " should queue till repaint", o, n);
		didQueue.push([fn, o, n]);
	}
	else {		// will*
		//	console.log(name + " may delay by promise", o, n);
		var res = fn(o, n);		// or pass  done() resolver

		if (isProm(res))
			{ res.then(then); }
	}
}

function fireHooks(name, o, n, then) {
	var hook = o.hooks[name];

	if (hook) {
		var did = startsWith(name, "did");

		if (isArr(hook)) {
			hook.forEach(function(hook2) {
				fireHook(did, hook2, o, n, then);
			});
		}
		else
			{ fireHook(did, hook, o, n, then); }
	}
}

function nextNode(node, body) {
	return body[node.idx + 1];
}

function prevNode(node, body) {
	return body[node.idx - 1];
}

// ? removes if !recycled
function nextSib(sib) {
	return sib.nextSibling;
}

// ? removes if !recycled
function prevSib(sib) {
	return sib.previousSibling;
}

// todo: hooks
function removeChild(parEl, el) {
	var node = el._node, hooks = node.hooks;

	hooks && fireHooks("willRemove", node);

	if (node.ref != null && node.ref[0] == "^")
		{ console.log("clean exposed ref", node.ref); }

	if (isArr(node.body)) {
	//	var parEl = node.el;
		for (var i = 0; i < node.body.length; i++)
			{ removeChild(el, node.body[i].el); }
	}

	parEl.removeChild(el);

	hooks && fireHooks("didRemove", node);
}

// todo: hooks
function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;
	hooks && fireHooks(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? "didReinsert" : "didInsert", node);
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
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
		var min = null;

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

function syncChildren(node, parEl) {
	var body = node.body;
	// breaking condition is convergance

	var lftNode		= body[0],
		lftSib		= parEl.firstChild,
		rgtNode		= body[body.length - 1],
		rgtSib		= parEl.lastChild,
		newSibs		= null;

	var tmpSib = null;

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
			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib && !lftSib._node.recycled && lftSib._node.parent != parEl._node) {
				tmpSib = nextSib(lftSib);
				removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				{ break converge; }
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);
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
			if (rgtSib && !rgtSib._node.recycled && rgtSib._node.parent != parEl._node) {
				tmpSib = prevSib(rgtSib);
				removeChild(parEl, rgtSib);
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				{ break converge; }
			if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);
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

function VNode(type) {
	this.type = type;
}

VNode.prototype = {
	constructor: VNode,

	type:	null,

	get vm() {
		var n = this;
		while (n.vmid == null)
			{ n = n.parent; }
		return views[n.vmid];
	},

	vmid:	null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	key:	null,
	ref:	null,
	data:	null,
	hooks:	null,
	html:	false,

	el:	null,

	tag:	null,
	attrs:	null,
	body:	null,
	fixed: false,

	_class:	null,

	idx:	null,
	parent:	null,

	// transient flags maintained for cleanup passes, delayed hooks, etc
//	_recycled:		false,		// true when findDonor/graft pass is done
//	_wasSame:		false,		// true if _diff result was false
//	_delayedRemove:	false,		// true when willRemove hook returns a promise

//	_setTag: function() {},

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

function VNodeFixed(type) {
	VNode.call(this, type);
}

var proto = Object.create(VNode.prototype);
proto.constructor = VNodeFixed;
proto.fixed = true;

VNodeFixed.prototype = proto;

function defineElement(tag, arg1, arg2, fixed) {
	var node = fixed ? new VNodeFixed(VTYPE.ELEMENT) : new VNode(VTYPE.ELEMENT);

	var attrs, body;

	if (isUndef(arg2)) {
		if (isObj(arg1))
			{ attrs = arg1; }
		else
			{ body = arg1; }
	}
	else {
		attrs = arg1;
		body = arg2;
	}

	if (attrs != null) {
		if (attrs._key != null)
			{ node.key = attrs._key; }

		if (attrs._ref != null)
			{ node.ref = attrs._ref; }

		if (attrs._hooks != null)
			{ node.hooks = attrs._hooks; }

		if (attrs._html != null)
			{ node.html = attrs._html; }

		if (attrs._data != null)
			{ node.data = attrs._data; }

		node.attrs = attrs;
	}

	var parsed = parseTag(tag);

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


//	function VTag() {}

var tagCache = {};

var RE_ATTRS = /\[(\w+)(?:=(\w+))?\]/g;

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

//import { DEBUG } from './DEBUG';


// newNode can be either {class: style: } or full new VNode
// will/didPatch?
function patchNode(o, n) {
	if (n.type != null) {
		// full new node
	}
	else {
		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);
		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, donor.attrs, n);
		// prepend any fixed shorthand class
		if (o._class != null) {
			var aclass = oattrs.class;
			oattrs.class = aclass != null ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}

function findDonorNode(n, nPar, oPar, fromIdx, toIdx) {		// pre-tested isView?
	var oldBody = oPar.body;

	for (var i = fromIdx || 0; i < oldBody.length; i++) {
		var o = oldBody[i];

		if (n.type == VTYPE.VVIEW && o.vmid != null) {			// also ignore recycled/moved?
			var ov = views[o.vmid];

			// match by key & viewFn
			if (ov.view == n.view && ov.key == n.key)
				{ return o; }
		}

		if (o.recycled || n.tag !== o.tag || n.type !== o.type)
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

function bindEv(el, type, fn) {
//	DEBUG && console.log("addEventListener");
	el.addEventListener(type, fn);
}

function unbindEv(el, type, fn) {
//	DEBUG && console.log("removeEventListener");
	el.removeEventListener(type, fn);
}

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
			if (os == null || nv != null && nv !== os[nn])
				{ n.el.style[nn] = autoPx(nn, nv); }
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					{ n.el.style[on] = null; }
			}
		}
	}
}

function wrapHandler(fn, args, sel) {
	function wrap(e) {
		var el = e.target;
		var node = el._node;

		if (sel && !e.target.matches(sel))
			{ return; }

		var out = fn.apply(null, fn.args.concat(e, node, node.vm));

		if (out === false) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	// for external diffing
	fn.wrap = wrap;
	fn.args = args || [];

	return wrap;
}

function patchEvent(node, name, sel, nval, oval) {
	var el = node.el;

	// param'd eg onclick: [myFn, 1, 2, 3...]
	if (isArr(nval)) {
		var newArgs = nval.slice(1);
		nval = nval[0];
	}

	if (isArr(oval))
		{ oval = oval[0]; }

	// basic onclick: myFn (or extracted)
	if (isFunc(nval)) {
		if (nval != oval) {
			bindEv(el, name, wrapHandler(nval, newArgs, sel));
			oval && unbindEv(el, name, oval.wrap);
		}
		else
			{ nval.args = newArgs || []; }
	}
	// delegated onclick: {".sel": myFn} & onclick: {".sel": [myFn, 1, 2, 3]}
	else {		// isObj
		for (var sel2 in nval) {
			var nval2 = nval[sel2];
			var oval2 = oval ? oval[sel2] : null;

			patchEvent(node, name, sel2, nval2, oval2);
		}
	}
}

function patchAttrs(vnode, donor) {
	var nattrs = vnode.attrs;		// || emptyObj
	var oattrs = donor.attrs;		// || emptyObj

	// if vals identical, do nothing.

	// TODO: do real prop diff

	// TODO: cmp spl props
	for (var key in nattrs) {
		var nval = nattrs[key];
		var oval = oattrs[key];

		if (nval === oval) {}
		else if (isStyleProp(key))
			{ patchStyle(vnode, donor); }
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			{ patchEvent(vnode, key.substr(2), null, nval, oval); }
		else
			{ setAttr(vnode, key, nattrs[key]); }
	}

	for (var key in oattrs) {
	//	if (nattrs[key] == null &&
		if (!(key in nattrs) &&
			!isStyleProp(key) &&
			!isSplProp(key) &&
			!isEvProp(key)
		)
			{ remAttr(vnode, key); }
	}
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
function patch(vnode, donor) {
	donor.hooks && fireHooks("willRecycle", donor, vnode);

	vnode.el = donor.el;
	donor.recycled = true;

	vnode.el._node = vnode;

	// "" => ""
	if (vnode.type === VTYPE.TEXT && vnode.body !== donor.body) {
		vnode.el.nodeValue = vnode.body;
		return;
	}

	// BUG: donation would break:
	// relies on both being present?
	// div (with attrs) <-> div (no attrs)
	if (vnode.attrs || donor.attrs)
		{ patchAttrs(vnode, donor); }

	// patch events

	var oldIsArr = isArr(donor.body);
	var newIsArr = isArr(vnode.body);

//	var nonEqNewBody = vnode.body != null && vnode.body !== donor.body;

	if (oldIsArr) {
		// [] => []
		if (newIsArr) {
		//	console.log('[] => []', donor.body, vnode.body);
			// graft children
			patchChildren(vnode, donor);
		}
		// [] => "" | null
		else if (vnode.body !== donor.body) {
			// needs cleanup pass?
		//	console.log('[] => ""', donor.body, vnode.body);

			if (vnode.body != null)
				{ vnode.el.textContent = vnode.body; }
			else {
				while (vnode.el.firstChild)
					{ vnode.el.removeChild(vnode.el.firstChild); }
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', donor.body, vnode.body);	// hydrate new here?
			while (vnode.el.firstChild)
				{ vnode.el.removeChild(vnode.el.firstChild); }
			patchChildren(vnode, donor);
		}
		// "" | null => "" | null
		else if (vnode.body !== donor.body) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode.el.firstChild)
				{ vnode.el.firstChild.nodeValue = vnode.body; }
			else
				{ vnode.el.textContent = vnode.body; }
		}
	}

	donor.hooks && fireHooks("didRecycle", donor, vnode);
}

// [] => []
function patchChildren(vnode, donor) {
	// first unrecycled node (search head)
	var fromIdx = 0;

	var donor2;

	for (var i = 0; i < vnode.body.length; i++) {
		var node2 = vnode.body[i];

		if (node2.type == VTYPE.VVIEW) {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))		// update/moveTo
				{ views[donor2.vmid]._update(node2.model, vnode, i); }		// withDOM
			else
				{ createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false); }	// createView, no dom (will be handled by sync below)
		}
		else if (node2.type == VTYPE.VMODEL)
			{ views[node2.vmid]._update(node2.model, vnode, i); }
		else {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))
				{ patch(node2, donor2); }
		}

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex

		if (donor2) {
			if (donor2.idx == fromIdx) {							// todo: conditional contigidx (first non-null)
			//	while (donor.body[fromIdx] && donor.body[fromIdx].recycled)
				fromIdx++;
			}
		}
	}

	if (!vnode.fixed)
		{ syncChildren(vnode, vnode.el); }
}

function setRef(vm, name, node) {
	var path = ["refs"].concat(name.replace("^", "").split("."));

	deepSet(vm, path, node);

	// bubble
	if (name[0] == "^" && vm.parent)
		{ setRef(vm.parent, name, node); }
}

// vnew, vold
function preProc(vnew, parent, idx, ownVmid, extKey) {		// , parentVm
	// injected views
	if (vnew.type === VTYPE.VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew.type === VTYPE.VVIEW) {

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
			{ setRef(vnew.vm, vnew.ref, vnew); }

		if (isArr(vnew.body)) {
		// declarative elems, comments, text nodes
			var body = vnew.body;

			for (var i = 0; i < body.length; i++) {
				var node2 = body[i];

//				if (isFunc(node2))
//					node2 = body[i] = node2();

				// remove null/undefined
				if (node2 == null)
					{ body.splice(i--, 1); }
				// flatten arrays
				else if (isArr(node2))
					{ insertArr(body, node2, i--, 1); }
				else if (node2.type === VTYPE.TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body === "")
						{ body.splice(i--, 1); }
					// merge with previous text node
					else if (i > 0 && body[i-1].type === VTYPE.TEXT) {
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
	}
}

function ViewModel(id, view, model, key, opts) {			// parent, idx, parentVm
	this.id = id;
	this.view = view;
	this.model = model;
	this.key = key == null ? model : key;
	this.render = view(this, model, key);			// , opts

	views[id] = this;		// must be done here so .parent in preproc can be used bubble refs

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

ViewModel.prototype = {
	constructor: ViewModel,

	id: null,

	// view + key serve as the vm's unique identity
	view: null,
	key: null,
	model: null,
	node: null,
	diff: null,
	diffLast: null,	// prior array of diff values
	hooks: null,
	render: null,

//	_setRef: function() {},

	// as plugins?
	get parent() {
		var p = this.node;

		while (p && (p = p.parent)) {
			if (p.vmid != null)
				{ return views[p.vmid]; }
		}

		return null;
	},
	get body() {
		return nextSubVms(this.node, []);
	},

//	api: null,
	refs: null,
	update: updateAsync,
	attach: attach,
	mount: mount,
	unmount: unmount,
	redraw: redrawAsync,			// should handle ancest level, raf-debounced, same with update

	_update: updateSync,
	_redraw: redrawSync,		// non-coalesced / synchronous
	/*
	function(ancest) {
	//	var vm = this;
	//	return !ancest : redraw.call(vm) vm.parent ? vm.parent.redraw(ancest - 1);
	},
	*/
//	diff: function(diff) {},
//	hooks: function(hooks) {},
	hook: function(hooks) {
		this.hooks = hooks;
	},
	events: null,
};

function nextSubVms(n, accum) {
	var body = n.body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2.vmid != null)
				{ accum.push(views[n2.vmid]); }
			else
				{ nextSubVms(n2, accum); }
		}
	}

	return accum;
}

function attach(el) {
}

function drainDidHooks(vm) {
	if (didQueue.length) {
		repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			{ item[0](item[1], item[2]); }
	}
}

// TODO: mount be made async?
function mount(el, isRoot) {
	var vm = this;

	vm.hooks && fireHooks("willMount", vm);

	if (isRoot) {
		while (el.firstChild)
			{ el.removeChild(el.firstChild); }

		this._redraw(null, null, false);
		hydrate(this.node, el);
	}
	else {
		this._redraw();

		if (el)
			{ insertBefore(el, this.node.el); }			// el.appendChild(this.node.el);
	}

	vm.hooks && fireHooks("didMount", vm);

	if (el)
		{ drainDidHooks(this); }

	return this;
}

function unmount() {
	var vm = this;

	vm.hooks && fireHooks("willUnmount", vm);

	var node = this.node;
	var parEl = node.el.parentNode;
	removeChild(parEl, node.el);

	vm.hooks && fireHooks("didUnmount", vm);

	drainDidHooks(this);
}

// this must be per view debounced, so should be wrapped in raf per instance
function redrawAsync(level) {
	level = level || 0;

	if (level == 0 || this.parent == null)
		{ this._redraw(); }							// this should be async also
	else
		{ this.parent.redraw(level - 1); }

	return this;
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
	var isRedrawRoot = newParent == null;
	var vm = this;
	var isMounted = vm.node && vm.node.el && vm.node.el.parentNode;

//	if (vm.diff && vm.diff(model))

	isMounted && vm.hooks && fireHooks("willRedraw", vm);

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs)
		{ vm.refs = null; }

	var vold = vm.node;
	var vnew = vm.render(vm, vm.model, vm.key);		// vm.opts

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

	if (withDOM !== false) {
		if (vold)
			{ patch(vnew, vold); }
		else
			{ hydrate(vnew); }
	}

	isMounted && vm.hooks && fireHooks("didRedraw", vm);

	if (isRedrawRoot)			// isMounted
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

// withRedraw?
function updateAsync(newModel) {
	return this._update(newModel);
}

function defineText(body) {
	var n = new VNode(VTYPE.TEXT);
	n.body = body;
	return n;
}

function defineComment(body) {
	return new VNode(VTYPE.COMMENT).body(body);
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

	type: VTYPE.VVIEW,
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

	type: VTYPE.VMODEL,
	vmid: null,
};

function injectView(vm) {
//	if (vm.node == null)
//		vm._redraw(null, null, false);

//	return vm.node;

	return new VModel(vm);
}

function injectElement(el) {
	var node = new VNode(VTYPE.ELEMENT);
	node.el = node.key = el;
	return node;
}

function defineElementFixed(tag, arg1, arg2) {
	return defineElement(tag, arg1, arg2, true);
}

var voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

function html(node) {
	// handle if node is vm
	if (node.render) {
		if (!node.node)
			{ node.mount(); }
		node = node.node;
	}

	var buf = "";
	switch (node.type) {
		case VTYPE.ELEMENT:
			if (node.el != null && node.tag == null)
				{ return node.el.outerHTML; }		// pre-existing dom elements (does not currently account for any props applied to them)

			buf += "<" + node.tag;

			if (node.attrs) {
				var style = isVal(node.attrs.style) ? node.attrs.style : "";
				var css = isObj(node.attrs.style) ? node.attrs.style : null;

				if (css)
					{ style += styleStr(css); }

				for (var pname in node.attrs) {
					if (isEvProp(pname) || pname[0] === "." || pname[0] === "_")
						{ continue; }

					var val = node.attrs[pname];

					if (isFunc(val))
						{ val = val(); }

					if (isObj(val))	// ?
						{ continue; }

					if (val === true)
						{ buf += " " + pname + '=""'; }
					else if (val === false) {}
					else if (val !== null && pname[0] !== ".")
						{ buf += " " + pname + '="' + val + '"'; }
				}

				if (style.length)
					{ buf += ' style="' + style.trim() + '"'; }
			}

			// if body-less svg node, auto-close & return
			if (node.ns != null && node.tag !== "svg" && node.tag !== "math" && node.body == null)
				{ return buf + "/>"; }
			else
				{ buf += ">"; }
			break;
		case VTYPE.TEXT:
			return node.body;
			break;
	}

	if (!voidTags.test(node.tag)) {
		if (isArr(node.body)) {
			node.body.forEach(function(n2) {
				buf += html(n2);
			});
		}
		else
			{ buf += node.body || ""; }

		buf += "</" + node.tag + ">";
	}

	return buf;
}

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

	} while (targ = targ.parent);
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

ViewModel.prototype.emit = emit;
ViewModel.prototype.on = on;

exports.ViewModel = ViewModel;
exports.VNode = VNode;
exports.createView = createView;
exports.defineElement = defineElement;
exports.defineText = defineText;
exports.defineComment = defineComment;
exports.defineView = defineView;
exports.injectView = injectView;
exports.injectElement = injectElement;
exports.defineElementFixed = defineElementFixed;
exports.patchNode = patchNode;
exports.html = html;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=domvm.js.map
