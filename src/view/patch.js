import { VTYPE } from './VTYPE';
import { isArr, isVal, isFunc, isObj } from '../utils';
import { autoPx, isStyleProp, isSplProp, isEvProp } from './utils';
import { syncChildren } from './syncChildren';
import { setAttr, remAttr } from './attrs';
import { views, createView } from './createView';
import { defineElement } from './defineElement';

//import { DEBUG } from './DEBUG';


// newNode can be either {class: style: } or full new VNode
export function patchNode(o, n) {
	if (n._type != null) {
	}
	else {
	//	patch(o, defineElement(o._tag));
	//	patch class, patch style
	}
}

function findDonorNode(n, nPar, oPar, fromIdx, toIdx) {		// pre-tested isView?
	var oldBody = oPar._body;

	for (var i = fromIdx || 0; i < oldBody.length; i++) {
		var o = oldBody[i];

		if (n._type == VTYPE.VVIEW && o._vmid != null) {			// also ignore recycled/moved?
			var ov = views[o._vmid];

			// match by key & viewFn
			if (ov._view == n._view && ov._key == n._key)
				return o;
		}

		if (o._recycled || n._tag !== o._tag || n._type !== o._type)
			continue;

		// if n._view

		if (n._key === o._key)		// accounts for matching & both null
			return o;
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
export function patchStyle(n, o) {
	var ns = n._attrs.style;
	var os = o ? o._attrs.style : null;		// || emptyObj?

	// replace or remove in full
	if (ns == null || isVal(ns))
		n._el.style.cssText = ns;
	else {
		for (var nn in ns) {
			var nv = ns[nn];
			if (os == null || nv != null && nv !== os[nn])
				n._el.style[nn] = autoPx(nn, nv);
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					n._el.style[on] = null;
			}
		}
	}
}

export function wrapHandler(fn, args, sel) {
	function wrap(e) {
		var el = e.target;
		var node = el._node;

		if (sel && !e.target.matches(sel))
			return;

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

export function patchEvent(node, name, sel, nval, oval) {
	var el = node._el;

	// param'd eg onclick: [myFn, 1, 2, 3...]
	if (isArr(nval)) {
		var newArgs = nval.slice(1);
		nval = nval[0];
	}

	if (isArr(oval))
		oval = oval[0];

	// basic onclick: myFn (or extracted)
	if (isFunc(nval)) {
		if (nval != oval) {
			bindEv(el, name, wrapHandler(nval, newArgs, sel));
			oval && unbindEv(el, name, oval._wrap);
		}
		else
			nval._args = newArgs || [];
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

export function patchAttrs(vnode, donor) {
	const nattrs = vnode._attrs;		// || emptyObj
	const oattrs = donor._attrs;		// || emptyObj

	// if vals identical, do nothing.

	// TODO: do real prop diff

	// TODO: cmp spl props
	for (var key in nattrs) {
		var nval = nattrs[key];
		var oval = oattrs[key];

		if (nval === oval) {}
		else if (isStyleProp(key))
			patchStyle(vnode, donor);
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key.substr(2), null, nval, oval);
		else
			setAttr(vnode, key, nattrs[key]);
	}

	for (var key in oattrs) {
	//	if (nattrs[key] == null &&
		if (!(key in nattrs) &&
			!isStyleProp(key) &&
			!isSplProp(key) &&
			!isEvProp(key)
		)
			remAttr(vnode, key);
	}
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
export function patch(vnode, donor) {
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
		patchAttrs(vnode, donor);

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
				vnode._el.textContent = vnode._body;
			else {
				while (vnode._el.firstChild)
					vnode._el.removeChild(vnode._el.firstChild);
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', donor._body, vnode._body);	// hydrate new here?
			while (vnode._el.firstChild)
				vnode._el.removeChild(vnode._el.firstChild);
			patchChildren(vnode, donor);
		}
		// "" | null => "" | null
		else if (vnode._body !== donor._body) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode._el.firstChild)
				vnode._el.firstChild.nodeValue = vnode._body;
			else
				vnode._el.textContent = vnode._body;
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
				views[donor2._vmid]._update(node2._model, vnode, i);		// withDOM
			else
				createView(node2._view, node2._model, node2._key, node2._opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)
		}
		else if (node2._type == VTYPE.VMODEL)
			views[node2._vmid]._update(node2._model, vnode, i);
		else {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))
				patch(node2, donor2);
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
		syncChildren(vnode, vnode._el);
}