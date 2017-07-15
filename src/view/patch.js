import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr, binaryKeySearch } from '../utils';
import { preProc } from './preProc';
import { hydrateBody } from './hydrate';
import { clearChildren } from './dom';
import { syncChildren } from './syncChildren';
import { fireHook } from './hooks';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { FIXED_BODY, DEEP_REMOVE, KEYED_LIST, LAZY_LIST } from './initElementNode';

function findSequential(n, obody, fromIdx, toIdx) {		// pre-tested isView?
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (n.type === VVIEW && o.vm != null) {			// also ignore recycled/moved?
			var ov = o.vm;

			// match by key & viewFn
			if (ov.view === n.view && ov.key === n.key)
				return o;
		}

		if (o.el._node !== o || n.tag !== o.tag || n.type !== o.type || n.vm !== o.vm || n.key !== o.key)
			continue;

		return o;
	}

	return null;
}

// this also acts as a linear adopter when all keys are null
function findKeyedSequential(n, obody, fromIdx) {
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (o.key === n.key)
			return o;
	}

	return null;
}

// list must be a sorted list of vnodes by key
function findKeyedBinary(n, list) {
	var idx = binaryKeySearch(list, n.key);
	return idx > -1 ? list[idx] : null;
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
export function patch(vnode, donor) {
	donor.hooks && fireHook("willRecycle", donor, vnode);

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
	var newIsArr = isArr(nbody);
	var newIsLazy = (vnode.flags & LAZY_LIST) === LAZY_LIST;

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr || newIsLazy) {
		//	console.log('[] => []', obody, nbody);
			// graft children
			patchChildren(vnode, donor, newIsLazy);
		}
		// [] => "" | null
		else if (nbody !== obody) {
			// needs cleanup pass?
		//	console.log('[] => ""', obody, nbody);

			if (nbody != null) {
				if (vnode.raw)
					el.innerHTML = nbody;
				else
					el.textContent = nbody;
			}
			else
				clearChildren(donor);
		}
	}
	else {
		// "" | null => []
		if (newIsArr || newIsLazy) {
		//	console.log('"" => []', obody, nbody);	// hydrate new here?
			clearChildren(donor);
			newIsLazy && nbody.body(vnode);
			hydrateBody(vnode);
		}
		// "" | null => "" | null
		else if (nbody !== obody) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode.raw)
				el.innerHTML = nbody;
			else if (donor.raw)
				el.textContent = nbody;
			else if (el.firstChild)
				el.firstChild.nodeValue = nbody;
			else
				el.textContent = nbody;
		}
	}

	donor.hooks && fireHook("didRecycle", donor, vnode);
}

function sortByKey(a, b) {
	return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
}

// larger qtys of KEYED_LIST children will use binary search
const SEQ_SEARCH_MAX = 100;

// todo: FIXED_BODY should always assume matching old vnode by index rather than calling findDonor
// todo: fall back to binary search only after failing findKeyedSequential (slice off rest of old body)
// [] => []
function patchChildren(vnode, donor, newIsLazy) {
	var nbody		= vnode.body,
		nlen		= nbody.length,
		obody		= donor.body,
		olen		= obody.length,
		oldIsFixed	= (donor.flags & FIXED_BODY) === FIXED_BODY,
		oldIsKeyed	= (donor.flags & KEYED_LIST) === KEYED_LIST,
		domSync		= !oldIsFixed && donor.type === ELEMENT,
		find		= findSequential,	// default
		list		= obody;			// default

	if (domSync && nlen === 0) {
		clearChildren(donor);
		if (newIsLazy)
			vnode.body = [];    // nbody.tpl(all);
		return;
	}

	// use binary search for non-static keyed lists of large length
	if (oldIsKeyed) {
		if (olen > SEQ_SEARCH_MAX && !oldIsFixed) {
			find = findKeyedBinary;
			list = obody.slice();
			list.sort(sortByKey);
		}
		else
			find = findKeyedSequential;
	}

	var donor2,
		node2,
		diffRes,
		remake,
		type2,
		fromIdx = 0;				// first unrecycled node (search head)

	if (newIsLazy) {
		if (!oldIsKeyed)
			find = findKeyedSequential;

		var fnode2 = {key: null};

		var nbodyNew = Array(nlen);

		for (var i = 0; i < nlen; i++) {
			remake = false;
			diffRes = null;

			if (oldIsKeyed)
				fnode2.key = nbody.key(i);

			donor2 = find(fnode2, list, fromIdx);

			if (donor2 != null) {
				diffRes = nbody.diff(i, donor2);

				// diff returns same, so cheaply adopt vnode without patching
				if (diffRes === true) {
					node2 = donor2;
					node2.parent = vnode;
					node2.idx = i;
				}
				// diff returns new diffVals, so generate new vnode & patch
				else
					remake = true;
			}
			else
				remake = true;

			if (remake) {
				node2 = nbody.tpl(i);
				preProc(node2, vnode, i);

				node2._diff = diffRes != null ? diffRes : nbody.diff(i);

				if (donor2 != null)
					patch(node2, donor2);
			}
			else {
				// TODO: flag tmp FIXED_BODY on unchanged nodes?

				// domSync = true;		if any idx changes or new nodes added/removed
			}

			nbodyNew[i] = node2;

			// to keep search space small, if donation is non-contig, move node fwd?
			// re-establish contigindex
			if (find !== findKeyedBinary && donor2 != null && donor2.idx === fromIdx)
				fromIdx++;
		}

		// replace List w/ new body
		vnode.body = nbodyNew;
	}
	else {
		for (var i = 0; i < nlen; i++) {
			var node2 = nbody[i];
			var type2 = node2.type;

			// ELEMENT,TEXT,COMMENT
			if (type2 <= COMMENT) {
				if (donor2 = find(node2, list, fromIdx))
					patch(node2, donor2);
			}
			else if (type2 === VVIEW) {
				if (donor2 = find(node2, list, fromIdx))		// update/moveTo
					var vm = donor2.vm._update(node2.data, vnode, i);		// withDOM
				else
					var vm = createView(node2.view, node2.data, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)

				type2 = vm.node.type;
			}
			else if (type2 === VMODEL) {
				var vm = node2.vm._update(node2.data, vnode, i);
				type2 = vm.node.type;
			}

			// to keep search space small, if donation is non-contig, move node fwd?
			// re-establish contigindex
			if (find !== findKeyedBinary && donor2 != null && donor2.idx === fromIdx)
				fromIdx++;
		}
	}

	domSync && syncChildren(vnode, donor);
}