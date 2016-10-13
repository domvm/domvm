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
	return name[0] == "o" && name[1] == "n";
}

function isSplProp(name) {
	return name[0] == "_";
}

function isStyleProp(name) {
	return name == "style";
}

function remAttr(node, name) {
	node._el.removeAttribute(name);
}

// setAttr
// diff, ".", "on*", bool vals, skip _*, value/checked/selected selectedIndex
function setAttr(node, name, val) {
	var el = node._el;

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

/*
import { patchAttrs2 } from './patch';
import { VNode } from './VNode';
const fakeDonor = new VNode(VTYPE.ELEMENT);
fakeDonor._attrs = {};
*/

// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode._attrs;

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
	if (vnode._el == null) {
		if (vnode._type === VTYPE.ELEMENT) {
			vnode._el = withEl || document.createElement(vnode._tag);

			if (vnode._attrs)
				{ patchAttrs2(vnode); }

			if (isArr(vnode._body)) {
				vnode._body.forEach(function (vnode2, i) {
					if (vnode2._type == VTYPE.VMODEL) {
						var vm = views[vnode2._vmid];
						vm._redraw(vnode, i);
						vnode._el.insertBefore(vm._node._el, null);
					}
					else if (vnode2._type == VTYPE.VVIEW) {
						var vm = createView(vnode2._view, vnode2._model, vnode2._key, vnode2._opts)._redraw(vnode, i);		// todo: handle new model updates
						vnode._el.insertBefore(vm._node._el, null);
					}
					else
						{ vnode._el.insertBefore(hydrate(vnode2), null); }		// vnode._el.appendChild(hydrate(vnode2))
				});
			}
			else if (vnode._body != null && vnode._body !== "") {
				if (vnode._html)
					{ vnode._el.innerHTML = vnode._body; }
				else
					{ vnode._el.textContent = vnode._body; }
			}
		}
		else if (vnode._type === VTYPE.TEXT)
			{ vnode._el = withEl || document.createTextNode(vnode._body); }
	}

	vnode._el._node = vnode;

	return vnode._el;
}

//import { DEBUG } from './DEBUG';

function nextNode(node, body) {
	return body[node._idx + 1];
}

function prevNode(node, body) {
	return body[node._idx - 1];
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
	parEl.removeChild(el);
}

// todo: hooks
function insertBefore(parEl, el, refEl) {
	parEl.insertBefore(el, refEl);
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}

// dehydrate can return promise (from hook), to delay removal
// todo: hooks
function dehydrate(node) {
	if (isArr(node._body)) {
		var parEl = node._el;
		for (var i = 0; i < node._body.length; i++)
			{ removeChild(parEl, dehydrate(node._body[i])); }
	}

	return node._el;
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

	var areAdjacent	= rgtNode._idx === lftNode._idx + 1;
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
	return a._node._idx - b._node._idx;
}

function syncChildren(node, parEl) {
	var body = node._body;
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
		from_left:
		while (1) {
			// remove any non-recycled sibs whose el._node has the old parent
			if (lftSib && !lftSib._node._recycled && lftSib._node._parent != parEl._node) {
				tmpSib = nextSib(lftSib);
				removeChild(parEl, dehydrate(lftSib._node));
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				{ break converge; }
			else if (lftNode._el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode._el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				{ break; }
		}

//		DEBUG && console.log("from_right");
		from_right:
		while(1) {
			if (rgtSib && !rgtSib._node._recycled && rgtSib._node._parent != parEl._node) {
				tmpSib = prevSib(rgtSib);
				removeChild(parEl, dehydrate(rgtSib._node));
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				{ break converge; }
			if (rgtNode._el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);
				rgtNode = prevNode(rgtNode, body);
			}
			else if (rgtNode._el === rgtSib) {
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
	this._type = type;
}

VNode.prototype = {
	constructor: VNode,

	_type:	null,

	get _vm() {
		var n = this;
		while (n._vmid == null)
			{ n = n._parent; }
		return views[n._vmid];
	},

	_vmid:	null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	_key:	null,
	_ref:	null,
	_data:	null,
	_hooks:	null,
	_html:	false,

	_el:	null,

	_tag:	null,
	_attrs:	null,
	_body:	null,
	_fixed: false,

	_class:	null,

	_idx:	null,
	_parent:null,

	// transient flags maintained for cleanup passes, delayed hooks, etc
	_recycled:		false,		// true when findDonor/graft pass is done
	_wasSame:		false,		// true if _diff result was false
	_delayedRemove:	false,		// true when willRemove hook returns a promise

//	_setTag: function() {},

	// break out into optional fluent module
	key:	function(val) { this._key	= val; return this; },
	ref:	function(val) { this._ref	= val; return this; },		// deep refs
	data:	function(val) { this._data	= val; return this; },
	hooks:	function(val) { this._hooks	= val; return this; },		// h("div")._hooks()
	html:	function(val) { this._html	= true; return this.body(val); },

	body:	function(val) { this._body	= val; return this; },
};

function VNodeFixed(type) {
	VNode.call(this, type);
}

var proto = Object.create(VNode.prototype);
proto.constructor = VNodeFixed;
proto._fixed = true;

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
			{ node._key = attrs._key; }

		if (attrs._ref != null)
			{ node._ref = attrs._ref; }

		if (attrs._hooks != null)
			{ node._hooks = attrs._hooks; }

		if (attrs._html != null)
			{ node._html = attrs._html; }

		if (attrs._data != null)
			{ node._data = attrs._data; }

		node._attrs = attrs;
	}

	var parsed = parseTag(tag);

	node._tag = parsed.tag;

	if (parsed.id || parsed.class || parsed.attrs) {
		var p = node._attrs || {};

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

//		if (node._attrs != p)
			node._attrs = p;
	}

	if (body != null)
		{ node._body = body; }

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


function findDonorNode(n, nPar, oPar, fromIdx, toIdx) {		// pre-tested isView?
	var oldBody = oPar._body;

	for (var i = fromIdx || 0; i < oldBody.length; i++) {
		var o = oldBody[i];

		if (n._type == VTYPE.VVIEW && o._vmid != null) {			// also ignore recycled/moved?
			var ov = views[o._vmid];

			// match by key & viewFn
			if (ov._view == n._view && ov._key == n._key)
				{ return o; }
		}

		if (o._recycled || n._tag !== o._tag || n._type !== o._type)
			{ continue; }

		// if n._view

		if (n._key === o._key)		// accounts for matching & both null
			{ return o; }
		else {
			//
			if (o._key == null) {
				return o;
			}
			// n.key && o.key, ident?
			else {
			//	console.log(n._key, o._key);
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
	var ns = n._attrs.style;
	var os = o ? o._attrs.style : null;		// || emptyObj?

	// replace or remove in full
	if (ns == null || isVal(ns))
		{ n._el.style.cssText = ns; }
	else {
		for (var nn in ns) {
			var nv = ns[nn];
			if (os == null || nv != null && nv !== os[nn])
				{ n._el.style[nn] = autoPx(nn, nv); }
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					{ n._el.style[on] = null; }
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

		var out = fn.apply(null, fn._args.concat(e, node, node._vm));

		if (out === false) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	// for external diffing
	fn._wrap = wrap;
	fn._args = args || [];

	return wrap;
}

function patchEvent(node, name, sel, nval, oval) {
	var el = node._el;

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
			oval && unbindEv(el, name, oval._wrap);
		}
		else
			{ nval._args = newArgs || []; }
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
	var nattrs = vnode._attrs;		// || emptyObj
	var oattrs = donor._attrs;		// || emptyObj

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
	// graft node

	vnode._el = donor._el;
	donor._recycled = true;

	vnode._el._node = vnode;

	// "" => ""
	if (vnode._type === VTYPE.TEXT && vnode._body !== donor._body) {
		vnode._el.nodeValue = vnode._body;
		return;
	}

	// BUG: donation would break:
	// relies on both being present?
	// div (with attrs) <-> div (no attrs)
	if (vnode._attrs || donor._attrs)
		{ patchAttrs(vnode, donor); }

	// patch events

	var oldIsArr = isArr(donor._body);
	var newIsArr = isArr(vnode._body);

//	var nonEqNewBody = vnode._body != null && vnode._body !== donor._body;

	if (oldIsArr) {
		// [] => []
		if (newIsArr) {
		//	console.log('[] => []', donor._body, vnode._body);
			// graft children
			patchChildren(vnode, donor);
		}
		// [] => "" | null
		else if (vnode._body !== donor._body) {
			// needs cleanup pass?
		//	console.log('[] => ""', donor._body, vnode._body);

			if (vnode._body != null)
				{ vnode._el.textContent = vnode._body; }
			else {
				while (vnode._el.firstChild)
					{ vnode._el.removeChild(vnode._el.firstChild); }
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', donor._body, vnode._body);	// hydrate new here?
			while (vnode._el.firstChild)
				{ vnode._el.removeChild(vnode._el.firstChild); }
			patchChildren(vnode, donor);
		}
		// "" | null => "" | null
		else if (vnode._body !== donor._body) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode._el.firstChild)
				{ vnode._el.firstChild.nodeValue = vnode._body; }
			else
				{ vnode._el.textContent = vnode._body; }
		}
	}
}

// [] => []
function patchChildren(vnode, donor) {
	// first unrecycled node (search head)
	var fromIdx = 0;

	var donor2;

	for (var i = 0; i < vnode._body.length; i++) {
		var node2 = vnode._body[i];

		if (node2._type == VTYPE.VVIEW) {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))		// update/moveTo
				{ views[donor2._vmid]._update(node2._model, vnode, i); }		// withDOM
			else
				{ createView(node2._view, node2._model, node2._key, node2._opts)._redraw(vnode, i, false); }	// createView, no dom (will be handled by sync below)
		}
		else if (node2._type == VTYPE.VMODEL)
			{ views[node2._vmid]._update(node2._model, vnode, i); }
		else {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))
				{ patch(node2, donor2); }
		}

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex

		if (donor2) {
			if (donor2._idx == fromIdx) {							// todo: conditional contigidx (first non-null)
			//	while (donor._body[fromIdx] && donor._body[fromIdx]._recycled)
				fromIdx++;
			}
		}
	}

	if (!vnode._fixed)
		{ syncChildren(vnode, vnode._el); }
}

function setRef(vm, name, node) {
	if (vm.refs == null)
		{ vm.refs = {}; }

//	if (name[0] == "^")		// gotta be careful with cleanup of these

	var path = name.split("."), seg;

	var refs = vm.refs;

	while (seg = path.shift()) {
		if (path.length == 0)
			{ refs[seg] = node; }
		else
			{ refs[seg] = refs = {}; }
	}
}

// vnew, vold
function preProc(vnew, parent, idx, ownVmid) {		// , parentVm
//	console.count("x");

//	this.update(model, parent, idx, parentVm, false);

	// should this be opt-in?


//	this._parent = parentVm;
//	parentVm._body.push(this);		// if parentVm._body

	// switch (vnode._type) {}
	// TYPE_ELEM
	// TYPE_TEXT
	// TYPE_VIEW
	// TYPE_COMMENT

	// TYPE_EXTVIEW
	// TYPE_EXTELEM
	// declarative views


	// injected views
	if (vnew._type === VTYPE.VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew._type === VTYPE.VVIEW) {

	}
	// injected and declared elems/text/comments
	else {
		vnew._parent = parent;
		vnew._idx = idx;
		vnew._vmid = ownVmid;

		var attrs = vnew._attrs;
		if (attrs) {
			if (attrs._ref != null)
				{ setRef(vnew._vm, attrs._ref, vnew); }		// _vm getter traverses up each time, can optimize by passing parentVm through to here
		}

		if (isArr(vnew._body)) {
		// declarative elems, comments, text nodes
			var body = vnew._body;

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
				else if (node2._type === VTYPE.TEXT) {
					// remove empty text nodes
					if (node2._body == null || node2._body === "")
						{ body.splice(i--, 1); }
					// merge with previous text node
					else if (i > 0 && body[i-1]._type === VTYPE.TEXT) {
						body[i-1]._body += node2._body;
						body.splice(i--, 1);
					}
					else
						{ preProc(node2, vnew, i); }		// , /*vnew._vm ||*/ parentVm
				}
				else {
			//		if (node2._ref != null)
			//			parentVm._setRef(node2._ref, node2);

					preProc(node2, vnew, i);			// , /*vnew._vm ||*/ parentVm
	/*
					// init/populate keys in in parent
					if (node2._key != null) {
						if (vnew._keys == null)
							vnew._keys = {};

						vnew._keys[node2._key] = i;
					}
	*/
				}
			}
		}
	}

//		else if (vnew._type === TYPE_TEXT) {}
//		else if (vnew._type === TYPE_COMMENT) {}
}

function ViewModel(id, view, model, key, opts) {			// parent, idx, parentVm
	this._id = id;
	this._view = view;
	this._model = model;
	this._key = key == null ? model : key;
	this._render = view(this, model, key);			// , opts

//	this.update(model, parent, idx, parentVm, false);

	// proc opts, evctx, watch

//	this.update = function(model, withRedraw, parent, idx, parentVm) {};
}

ViewModel.prototype = {
	constructor: ViewModel,

	_id: null,

	// view + key serve as the vm's unique identity
	_view: null,
	_key: null,
	_model: null,
	_node: null,
	_diff: null,
	_diffLast: null,	// prior array of diff values
	_hooks: null,
	_render: null,

//	_setRef: function() {},

	// parent vm and initial vm descendents
//	_parent: null,
//	_body: null,

	// as plugins?
	get _parent() {
		var p = this._node;

		while (p = p._parent) {
			if (p._vmid != null)
				{ return views[p._vmid]; }
		}

		return null;
	},
	get _body() {
		return nextSubVms(this._node, []);
	},

//	api: null,
	refs: null,
	update: updateAsync,
	_update: updateSync,
	attach: attach,
	mount: mount,
	redraw: redrawAsync,			// should handle ancest level, raf-debounced, same with update
	_redraw: redrawSync,		// non-coalesced / synchronous
	/*
	function(ancest) {
	//	var vm = this;
	//	return !ancest : redraw.call(vm) vm._parent ? vm._parent.redraw(ancest - 1);
	},
	*/
	diff: function(diff) {},
	hooks: function(hooks) {},
};

function nextSubVms(n, accum) {
	var body = n._body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2._vmid != null)
				{ accum.push(views[n2._vmid]); }
			else
				{ nextSubVms(n2, accum); }
		}
	}

	return accum;
}

function attach(el) {
}

// TODO: mount be made async?
function mount(el, isRoot) {
	if (el == null)
		{ this._redraw(); }
	else if (isRoot) {
		while (el.firstChild)
			{ el.removeChild(el.firstChild); }

		this._redraw(null, null, false);
		hydrate(this._node, el);
	}
	else {
		this._redraw();
		el.insertBefore(this._node._el, null);		// el.appendChild(this._node._el);
	}

	return this;
}

// this must be per view debounced, so should be wrapped in raf per instance
function redrawAsync(level) {
	level = level || 0;

	if (level == 0 || this._parent == null)
		{ this._redraw(); }							// this should be async also
	else
		{ this._parent.redraw(level - 1); }

	return this;
}

// level, isRoot?
// newParent, newIdx
// ancest by ref, by key
function redrawSync(newParent, newIdx, withDOM) {
//	let isRedrawRoot = newParent != null;
	var vm = this;

//	if (vm._diff && vm._diff(model))

	// todo: test result of willRedraw hooks before clearing refs
	// todo: also clean up any refs exposed by this view from parents, should tag with src_vm during setting
	if (vm.refs)
		{ vm.refs = null; }

	var vold = vm._node;
	var vnew = vm._render(vm, vm._model, vm._key);		// vm._opts

	preProc(vnew, null, null, vm._id);	// , vm._id

	vm._node = vnew;
//	vnew._vm = vm;			// this causes a perf drop 1.53ms -> 1.62ms			how important is this?
	vnew._vmid = vm._id;

	if (newParent) {
		vnew._idx = newIdx;
		vnew._parent = newParent;
		newParent._body[newIdx] = vnew;
		// todo: bubble refs, etc?
	}
	else if (vold && vold._parent) {
		vnew._idx = vold._idx;
		vnew._parent = vold._parent;
		vold._parent._body[vold._idx] = vnew;
	}

	if (withDOM !== false) {
		if (vold)
			{ patch(vnew, vold); }
		else
			{ hydrate(vnew); }
	}

	return vm;
}

// withRedraw?
// this doubles as moveTo
// will/didUpdate
function updateSync(newModel, newParent, newIdx, withDOM) {			// parentVm
	var vm = this;

	if (newModel != null)				// && vm._key !== vm._model
		{ vm._model = newModel; }

	return vm._redraw(newParent, newIdx, withDOM);
/*
	if (parentVm != null) {
		vm._parent = parentVm;
		parentVm._body.push(vm);
	}
*/
}

// withRedraw?
function updateAsync(newModel) {
	return this._update(newModel);
}

// global id counter
var vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
var views = {};

function createView(view, model, key, opts) {
	if (view._type == VTYPE.VVIEW) {
		model	= view._model;
		key		= view._key;
		opts	= view._opts;
		view	= view._view;
	}

	var vm = new ViewModel(vmid++, view, model, key, opts);
	views[vm._id] = vm;
	return vm;
}

function defineText(body) {
	return new VNode(VTYPE.TEXT).body(body);
}

function defineComment(body) {
	return new VNode(VTYPE.COMMENT).body(body);
}

// placeholder for declared views
function VView(view, model, key, opts) {
	this._view = view;
	this._model = model;
	this._key = key == null ? model : key;	// same logic as ViewModel
	this._opts = opts;
}

VView.prototype = {
	constructor: VView,

	_type: VTYPE.VVIEW,
	_view: null,
	_model: null,
	_key: null,
	_opts: null,
};

function defineView(view, model, key, opts) {
	return new VView(view, model, key, opts);
}

// placeholder for injected ViewModels
function VModel(vm) {
	this._vmid = vm._id;
}

VModel.prototype = {
	constructor: VModel,

	_type: VTYPE.VMODEL,
	_vmid: null,
};

function injectView(vm) {
//	if (vm._node == null)
//		vm._redraw(null, null, false);

//	return vm._node;

	return new VModel(vm);
}

function injectElement(el) {
	var node = new VNode(VTYPE.ELEMENT);
	node._el = node._key = el;
	return node;
}

function defineElementFixed(tag, arg1, arg2) {
	return defineElement(tag, arg1, arg2, true);
}

var voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;

function html(node) {
	// handle if node is vm
	if (node._render) {
		if (!node._node)
			{ node.mount(); }
		node = node._node;
	}

	var buf = "";
	switch (node._type) {
		case VTYPE.ELEMENT:
			if (node._el != null && node._tag == null)
				{ return node._el.outerHTML; }		// pre-existing dom elements (does not currently account for any props applied to them)

			buf += "<" + node._tag;

			if (node._attrs) {
				var style = isVal(node._attrs.style) ? node._attrs.style : "";
				var css = isObj(node._attrs.style) ? node._attrs.style : null;

				if (css)
					{ style += styleStr(css); }

				for (var pname in node._attrs) {
					if (isEvProp(pname) || pname[0] === "." || pname[0] === "_")
						{ continue; }

					var val = node._attrs[pname];

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
			if (node.ns != null && node._tag !== "svg" && node._tag !== "math" && node._body == null)
				{ return buf + "/>"; }
			else
				{ buf += ">"; }
			break;
		case VTYPE.TEXT:
			return node._body;
			break;
	}

	if (!voidTags.test(node._tag)) {
		if (isArr(node._body)) {
			node._body.forEach(function(n2) {
				buf += html(n2);
			});
		}
		else
			{ buf += node._body || ""; }

		buf += "</" + node._tag + ">";
	}

	return buf;
}

exports.createView = createView;
exports.defineElement = defineElement;
exports.defineText = defineText;
exports.defineComment = defineComment;
exports.defineView = defineView;
exports.injectView = injectView;
exports.injectElement = injectElement;
exports.defineElementFixed = defineElementFixed;
exports.html = html;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=domvm.js.map
