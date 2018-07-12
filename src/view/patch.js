import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr, noop } from '../utils';
import { isHydrated } from "./utils";
import { preProc } from './preProc';
import { hydrateBody } from './hydrate';
import { clearChildren } from './dom';
import { syncChildren } from './syncChildren';
import { fireHook } from './hooks';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { FIXED_BODY, DEEP_REMOVE, KEYED_LIST, LAZY_LIST } from './initElementNode';

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
				return o;
		}
		else if (!alreadyAdopted(o) && n.tag === o.tag && n.type === o.type && n.key === o.key && (n.flags & ~DEEP_REMOVE) === (o.flags & ~DEEP_REMOVE))
			return o;
	}

	return null;
}

function findKeyed(n, obody, fromIdx) {
	if (obody._keys == null) {
		if (obody[fromIdx].key === n.key)
			return obody[fromIdx];
		else {
			var keys = {};
			for (var i = 0; i < obody.length; i++)
				keys[obody[i].key] = i;
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
export function patch(vnode, donor) {
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
		patchAttrs(vnode, donor, false);

	// patch events

	var oldIsArr = isArr(obody);
	var newIsArr = isArr(nbody)
	var lazyList = (vnode.flags & LAZY_LIST) === LAZY_LIST;

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr || lazyList)
			patchChildren(vnode, donor);
		// [] => "" | null
		else if (nbody !== obody) {
			if (nbody != null)
				el.textContent = nbody;
			else
				clearChildren(donor);
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
				el.firstChild.nodeValue = nbody;
			else
				el.textContent = nbody;
		}
	}

	fireHook(donor.hooks, "didRecycle", donor, vnode);
}

function sortByKey(a, b) {
	return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
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
			vnode.body = [];	// nbody.tpl(all);
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
		var nbodyNew = Array(nlen);
	}

	for (var i = 0; i < nlen; i++) {
		if (isLazy) {
			var remake = false;

			if (doFind) {
				if (isKeyed)
					fnode2.key = nbody.key(i);

				donor2 = find(fnode2, obody, fromIdx);
			}

			if (donor2 != null) {
                foundIdx = donor2.idx;

				if (!nbody.diff.cmp(i, donor2)) {
					// almost same as reParent() in ViewModel
					node2 = donor2;
					node2.parent = vnode;
					node2.idx = i;
					node2._lis = false;
				}
				else
					remake = true;
			}
			else
				remake = true;

			if (remake) {
				node2 = nbody.tpl(i);			// what if this is a VVIEW, VMODEL, injected element?

				if (node2.type === VVIEW)
					node2 = createView(node2.view, node2.data, node2.key, node2.opts)._redraw(vnode, i, false).node;
				else {
					preProc(node2, vnode, i);

					node2._diff = nbody.diff.val(i);

					if (donor2 != null)
						patch(node2, donor2);
				}
			}
			else {
				// TODO: flag tmp FIXED_BODY on unchanged nodes?

				// domSync = true;		if any idx changes or new nodes added/removed
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
					donor2.vm._update(node2.data, vnode, i);		// withDOM
				}
				else
					createView(node2.view, node2.data, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)
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

				vm._update(node2.data, vnode, i, hasDOM);
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
				everNonseq = true;

			if (!isKeyed && olen > 100 && everNonseq && ++patched % 10 === 0)
				while (fromIdx < olen && alreadyAdopted(obody[fromIdx]))
					fromIdx++;
		}
	}

	// replace List w/ new body
	if (isLazy)
		vnode.body = nbodyNew;

	domSync && syncChildren(vnode, donor);
}