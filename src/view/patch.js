import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr } from '../utils';
import { views } from './ViewModel';
import { hydrateBody } from './hydrate';
import { removeChild } from './dom';
import { syncChildren } from './syncChildren';
import { fireHooks } from './hooks';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { FIXED_BODY, FAST_REMOVE } from './defineElement';

//import { DEBUG } from './DEBUG';

function findDonorNode(n, nPar, oPar, fromIdx, toIdx) {		// pre-tested isView?
	var oldBody = oPar.body;

	for (var i = fromIdx || 0; i < oldBody.length; i++) {
		var o = oldBody[i];

		if (n.type == VVIEW && o.vmid != null) {			// also ignore recycled/moved?
			var ov = views[o.vmid];

			// match by key & viewFn
			if (ov.view == n.view && ov.key == n.key)
				return o;
		}

		if (o.el._node != o || n.tag !== o.tag || n.type !== o.type)
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

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
export function patch(vnode, donor) {
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
		patchAttrs(vnode, donor);

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
					el.innerHTML = nbody;
				else
					el.textContent = nbody;
			}
			else {
				while (el.firstChild)
					removeChild(el, el.firstChild);
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
				el.innerHTML = nbody;
			else if (el.firstChild)
				el.firstChild.nodeValue = nbody;
			else
				el.textContent = nbody;
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
				patch(node2, donor2);
		}
		else if (type2 == VVIEW) {
			if (donor2 = findDonorNode(node2, vnode, donor, fromIdx))		// update/moveTo
				views[donor2.vmid]._update(node2.model, vnode, i);		// withDOM
			else
				createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)
		}
		else if (type2 == VMODEL)
			views[node2.vmid]._update(node2.model, vnode, i);

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex

		if (donor2) {
			if (donor2.idx == fromIdx) {							// todo: conditional contigidx (first non-null)
			//	while (obody[fromIdx] && obody[fromIdx].recycled)
				fromIdx++;
			}
		}
	}

	if (!(vnode.flags & FIXED_BODY))
		syncChildren(vnode);
}