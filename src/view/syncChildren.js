import { hydrate } from './hydrate';
import { isArr } from '../utils';
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
			removeChild(parEl, dehydrate(node._body[i]));
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
		var min = null;

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
	return a._node._idx - b._node._idx;
}

export function syncChildren(node, parEl) {
	var body = node._body;
	// breaking condition is convergance

	var lftNode		= body[0],
		lftSib		= parEl.firstChild,
		rgtNode		= body[body.length - 1],
		rgtSib		= parEl.lastChild,
		newSibs		= null;

	var tmpSib = null;

	if (lftSib == null) {
		body.forEach(node2 => parEl.appendChild(hydrate(node2)));
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
				break converge;
			else if (lftNode._el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode._el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				break;
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
				break converge;
			if (rgtNode._el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);
				rgtNode = prevNode(rgtNode, body);
			}
			else if (rgtNode._el === rgtSib) {
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