import { VTYPE } from './VTYPE';
import { isArr, isVal, isFunc, isObj, assignObj } from '../utils';
import { autoPx, isStyleProp, isSplProp, isEvProp } from './utils';
import { syncChildren, fireHooks } from './syncChildren';
import { setAttr, remAttr } from './attrs';
import { createView } from './createView';
import { views } from './ViewModel';
import { defineElement } from './defineElement';

//import { DEBUG } from './DEBUG';


// newNode can be either {class: style: } or full new VNode
// will/didPatch?
export function patchNode(o, n) {
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
				return o;
		}

		if (o.recycled || n.tag !== o.tag || n.type !== o.type)
			continue;

		// if n.view

		if (n.key === o.key)		// accounts for matching & both null
			return o;
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
export function patchStyle(n, o) {
	var ns = n.attrs.style;
	var os = o ? o.attrs.style : null;		// || emptyObj?

	// replace or remove in full
	if (ns == null || isVal(ns))
		n.el.style.cssText = ns;
	else {
		for (var nn in ns) {
			var nv = ns[nn];
			if (os == null || nv != null && nv !== os[nn])
				n.el.style[nn] = autoPx(nn, nv);
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					n.el.style[on] = null;
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

export function patchEvent(node, name, sel, nval, oval) {
	var el = node.el;

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
			oval && unbindEv(el, name, oval.wrap);
		}
		else
			nval.args = newArgs || [];
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
	const nattrs = vnode.attrs;		// || emptyObj
	const oattrs = donor.attrs;		// || emptyObj

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
		patchAttrs(vnode, donor);

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
				vnode.el.textContent = vnode.body;
			else {
				while (vnode.el.firstChild)
					vnode.el.removeChild(vnode.el.firstChild);
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', donor.body, vnode.body);	// hydrate new here?
			while (vnode.el.firstChild)
				vnode.el.removeChild(vnode.el.firstChild);
			patchChildren(vnode, donor);
		}
		// "" | null => "" | null
		else if (vnode.body !== donor.body) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode.el.firstChild)
				vnode.el.firstChild.nodeValue = vnode.body;
			else
				vnode.el.textContent = vnode.body;
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
				views[donor2.vmid]._update(node2.model, vnode, i);		// withDOM
			else
				createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)
		}
		else if (node2.type == VTYPE.VMODEL)
			views[node2.vmid]._update(node2.model, vnode, i);
		else {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))
				patch(node2, donor2);
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
		syncChildren(vnode, vnode.el);
}