import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr, binaryKeySearch } from '../utils';
import { preProc } from './preProc';
import { hydrateBody } from './hydrate';
import { clearChildren } from './dom';
import { syncChildren } from './syncChildren';
import { fireHooks } from './hooks';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { LazyBody } from './addons/lazyBody';
import { FIXED_BODY, DEEP_REMOVE, KEYED_LIST, LAZY_BODY } from './initElementNode';

function findDonor(n, obody, fromIdx, toIdx) {		// pre-tested isView?
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (n.type === VVIEW && o.vm != null) {			// also ignore recycled/moved?
			var ov = o.vm;

			// match by key & viewFn
			if (ov.view === n.view && ov.key === n.key)
				return o;
		}

		if (o.el._node !== o || n.tag !== o.tag || n.type !== o.type || n.vm !== o.vm)
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

// list must be a sorted list of vnodes by key
function findListDonor(n, list) {
	var idx = binaryKeySearch(list, n.key);
	return idx > -1 ? list[idx] : null;
}

function findDonor2(n, obody, fromIdx) {
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (o.key === n.key)
			return o;
	}

	return null;
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
export function patch(vnode, donor) {
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
		patchAttrs(vnode, donor);

	// patch events

	var oldIsArr = isArr(obody);
	var newIsArr = isArr(nbody);

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr || (vnode.flags & LAZY_BODY) === LAZY_BODY) {		// nbody instanceof LazyBody
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
		if (newIsArr) {
		//	console.log('"" => []', obody, nbody);	// hydrate new here?
			clearChildren(donor);
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

	donor.hooks && fireHooks("didRecycle", donor, vnode);
}

function sortByKey(a, b) {
	return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
}

function findAndPatch(node2, i, parent, list, find, fromIdx, donor2) {
	var type2 = node2.type;

	// ELEMENT,TEXT,COMMENT
	if (type2 <= COMMENT) {
		if (donor2 = donor2 || find(node2, list, fromIdx))
			patch(node2, donor2);
	}
	else if (type2 === VVIEW) {
		if (donor2 = donor2 || find(node2, list, fromIdx))		// update/moveTo
			var vm = donor2.vm._update(node2.model, parent, i);		// withDOM
		else
			var vm = createView(node2.view, node2.model, node2.key, node2.opts)._redraw(parent, i, false);	// createView, no dom (will be handled by sync below)

		type2 = vm.node.type;
	}
	else if (type2 === VMODEL) {
		var vm = node2.vm._update(node2.model, parent, i);
		type2 = vm.node.type;
	}

	return donor2;
}

// larger qtys of KEYED_LIST children will use binary search
const SEQ_SEARCH_MAX = 100;

// [] => []
function patchChildren(vnode, donor) {
	var nbody = vnode.body,
		nlen = nbody.length,
		obody = donor.body,
		olen = obody.length,
		fixedBody = (donor.flags & FIXED_BODY) === FIXED_BODY,
		domSync = donor.type === ELEMENT && !fixedBody;

	if (domSync && nlen === 0) {
		clearChildren(donor);
		if ((vnode.flags & LAZY_BODY) === LAZY_BODY)
			vnode.body = [];    // nbody.tpl(all);
		return;
	}

	var isList = (donor.flags & KEYED_LIST) === KEYED_LIST;

	// use binary search for non-static keyed lists of large length
	if (isList && !fixedBody && olen > SEQ_SEARCH_MAX) {
		var list = donor.body.slice();
		list.sort(sortByKey);
		var find = findListDonor;
	}
	else {
		var list = donor.body;
		var find = findDonor;
	}

	var donor2,
		node2,
		diffRes,
		remake,
		type2,
		fromIdx = 0;				// first unrecycled node (search head)

	if (isList && (donor.flags & LAZY_BODY) === LAZY_BODY) {		// 		// nbody instanceof LazyBody, list should always be keyed, but FIXED_BODY prevents binary search sorting
		find = findDonor2;

		var fnode2 = {key: null};

		var nbodyNew = Array(nbody.length);

		for (var i = 0; i < nlen; i++) {
			remake = false;
			diffRes = null;

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
			if (find !== findListDonor && donor2 != null && donor2.idx === fromIdx)
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
					var vm = donor2.vm._update(node2.model, vnode, i);		// withDOM
				else
					var vm = createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)

				type2 = vm.node.type;
			}
			else if (type2 === VMODEL) {
				var vm = node2.vm._update(node2.model, vnode, i);
				type2 = vm.node.type;
			}

			// to keep search space small, if donation is non-contig, move node fwd?
			// re-establish contigindex
			if (find !== findListDonor && donor2 != null && donor2.idx === fromIdx)
				fromIdx++;
		}
	}

	domSync && syncChildren(vnode, donor);
}