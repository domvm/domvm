import { emptyObj } from '../utils';
import { hydrate } from './hydrate';
import { prevSib, nextSib, insertBefore, insertAfter, removeChild } from './dom';

function nextNode(node, body) {
	return body[node.idx + 1];
}

function prevNode(node, body) {
	return body[node.idx - 1];
}

function parentNode(node) {
	return node.parent;
}

function cmpElNodeIdx(a, b) {
	return a._node.idx - b._node.idx;
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
	var areAdjacent	= rgtNode.idx === lftNode.idx + 1;
	var headToTail = areAdjacent ? false : lftSib._node === rgtNode;
	var tailToHead = areAdjacent ? true  : rgtSib._node === lftNode;

	if (headToTail || tailToHead) {
		return tmpEdges(function(lftLft, rgtRgt) {
			if (tailToHead)
				insertBefore(parEl, rgtSib, lftSib);

			if (headToTail)
				insertBefore(parEl, lftSib, rgtRgt);
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
					min = j;
			}

			if (min === i)
				continue;

			insertBefore(parEl, min, lftSib);

			i = min;
		}
	}, parEl, lftSib, rgtSib);
}

function cmpElNodeIdx(a, b) {
	return a._node.idx - b._node.idx;
}

export function syncChildren(node, donor) {
	var parEl		= node.el,
		body		= node.body,
		obody		= donor.body,
		lftNode		= body[0],
		rgtNode		= body[body.length - 1],
		lftSib		= ((obody)[0] || emptyObj).el,
	//	lftEnd		= prevSib(lftSib),
		rgtSib		= (obody[obody.length - 1] || emptyObj).el,
	//	rgtEnd		= nextSib(rgtSib),
		newSibs,
		tmpSib,
		lsNode,
		rsNode;

	converge:
	while (1) {
//		from_left:
		while (1) {
			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib) {
				// skip dom elements not created by domvm
				if ((lsNode = lftSib._node) === void 0) {
					lftSib = nextSib(lftSib);
					continue;
				}

				if (parentNode(lsNode) !== node) {
					tmpSib = nextSib(lftSib);
					lsNode.vm != null ? lsNode.vm.unmount(true) : removeChild(parEl, lftSib);
					lftSib = tmpSib;
					continue;
				}
			}

			if (lftNode == null)		// reached end
				break converge;
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);		// lftNode.vm != null ? lftNode.vm.mount(parEl, false, true, lftSib) :
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode.el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				break;
		}

//		from_right:
		while (1) {
		//	if (rgtSib === lftEnd)
		//		break converge;

			if (rgtSib) {
				if ((rsNode = rgtSib._node) === void 0) {
					rgtSib = prevSib(rgtSib);
					continue;
				}

				if (parentNode(rsNode) !== node) {
					tmpSib = prevSib(rgtSib);
					rsNode.vm != null ? rsNode.vm.unmount(true) : removeChild(parEl, rgtSib);
					rgtSib = tmpSib;
					continue;
				}
			}

			if (rgtNode === lftNode)		// converged
				break converge;
			else if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);		// rgtNode.vm != null ? rgtNode.vm.mount(parEl, false, true, nextSib(rgtSib) :
				rgtNode = prevNode(rgtNode, body);
			}
			else if (rgtNode.el === rgtSib) {
				rgtNode = prevNode(rgtNode, body);
				rgtSib = prevSib(rgtSib);
			}
			else
				break;
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