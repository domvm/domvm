import { hydrate } from './hydrate';
import { prevSib, nextSib, insertBefore, insertAfter, removeChild } from './dom';

function nextNode1(node, body) {
	return body[node.idx + 1];
}

function prevNode1(node, body) {
	return body[node.idx - 1];
}

function nextNode2(node, body) {
	return body[node.flatIdx + 1];
}

function prevNode2(node, body) {
	return body[node.flatIdx - 1];
}

function parentNode1(node) {
	return node.parent;
}

function parentNode2(node) {
	return node.flatParent;
}

function cmpElNodeIdx(a, b) {
	return a._node.idx - b._node.idx;
}

function cmpElNodeFlatIdx(a, b) {
	return a._node.flatIdx - b._node.flatIdx;
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

function headTailTry(parEl, lftSib, lftNode, rgtSib, rgtNode, frags) {
	var areAdjacent	= frags ? rgtNode.flatIdx == lftNode.flatIdx + 1 : rgtNode.idx == lftNode.idx + 1;
	var headToTail = areAdjacent ? false : lftSib._node == rgtNode;
	var tailToHead = areAdjacent ? true  : rgtSib._node == lftNode;

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

export function syncChildren(node, donor, frags) {
	if (frags) {
		var parEl		= node.el,
			body		= node.flatBody,
			obody		= donor.flatBody,
			parentNode	= parentNode2,
			prevNode	= prevNode2,
			nextNode	= nextNode2;
	}
	else {
		var parEl		= node.el,
			body		= node.body,
			obody		= donor.body,
			parentNode	= parentNode1,
			prevNode	= prevNode1,
			nextNode	= nextNode1;
	}

	var	lftNode		= body[0],
		rgtNode		= body[body.length - 1],
		lftSib		= obody[0].el,
	//	lftEnd		= prevSib(lftSib),
		rgtSib		= obody[obody.length - 1].el,
	//	rgtEnd		= nextSib(rgtSib),
		newSibs,
		tmpSib,
		lsNode,
		rsNode;


	converge:
	while (1) {
//		from_left:
		while (1) {
		//	if (lftSib == rgtEnd)		// if doing a partial sync (fragment), this is a breaking conditon for crossing into a neighboring fragment
		//		break converge;

			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib && parentNode(lsNode = lftSib._node) != node) {
				tmpSib = nextSib(lftSib);
				lsNode.vmid != null ? lsNode.vm().unmount(true) : removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				break converge;
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);		// lftNode.vmid != null ? lftNode.vm().mount(parEl, false, true, lftSib) :
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
		while(1) {
		//	if (rgtSib == lftEnd)
		//		break converge;

			if (rgtSib && parentNode(rsNode = rgtSib._node) != node) {
				tmpSib = prevSib(rgtSib);
				rsNode.vmid != null ? rsNode.vm().unmount(true) : removeChild(parEl, rgtSib);
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				break converge;
			else if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);		// rgtNode.vmid != null ? rgtNode.vm().mount(parEl, false, true, nextSib(rgtSib) :
				rgtNode = prevNode(rgtNode, body);
			}
			else if (rgtNode.el === rgtSib) {
				rgtNode = prevNode(rgtNode, body);
				rgtSib = prevSib(rgtSib);
			}
			else
				break;
		}

		if (newSibs = headTailTry(parEl, lftSib, lftNode, rgtSib, rgtNode, frags)) {
			lftSib = newSibs.lftSib;
			rgtSib = newSibs.rgtSib;
			continue;
		}

		newSibs = sortDOM(parEl, lftSib, rgtSib, frags ? cmpElNodeFlatIdx : cmpElNodeIdx);
		lftSib = newSibs.lftSib;
		rgtSib = newSibs.rgtSib;
	}
}