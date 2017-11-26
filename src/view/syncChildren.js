import { emptyObj, longestIncreasingSubsequence, binaryFindLarger } from '../utils';
import { hydrate } from './hydrate';
import { prevSib, nextSib, insertBefore, insertAfter, removeChild } from './dom';
import { devNotify } from "./addons/devmode";

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

const BREAK = 1;
const BREAK_ALL = 2;

function syncDir(advSib, advNode, insert, sibName, nodeName) {
	return function(node, parEl, body, state, convTest) {
		var sibNode, tmpSib;

		if (state[sibName]) {
			// skip dom elements not created by domvm
			if ((sibNode = state[sibName]._node) == null) {
				if (_DEVMODE)
					devNotify("FOREIGN_ELEMENT", [state[sibName]]);

				state[sibName] = advSib(state[sibName]);
				return;
			}

			if (parentNode(sibNode) !== node) {
				tmpSib = advSib(state[sibName]);
				sibNode.vm != null ? sibNode.vm.unmount(true) : removeChild(parEl, state[sibName]);
				state[sibName] = tmpSib;
				return;
			}
		}

		if (state[nodeName] == convTest)
			return BREAK_ALL;
		else if (state[nodeName].el == null) {
			insert(parEl, hydrate(state[nodeName]), state[sibName]);
			state[nodeName] = advNode(state[nodeName], body);		// also need to advance sib?
		}
		else if (state[nodeName].el === state[sibName]) {
			state[nodeName] = advNode(state[nodeName], body);
			state[sibName] = advSib(state[sibName]);
		}
		else {
			if (_DEVMODE) {
				if (state[nodeName].vm != null)
					devNotify("ALREADY_HYDRATED", [state[nodeName].vm]);
			}
			return BREAK;
		}
	};
}

var syncLft = syncDir(nextSib, nextNode, insertBefore, "lftSib", "lftNode");
var syncRgt = syncDir(prevSib, prevNode, insertAfter, "rgtSib", "rgtNode");

export function syncChildren(node, donor) {
	var obody	= donor.body,
		parEl	= node.el,
		body	= node.body,
		state = {
			lftNode:	body[0],
			rgtNode:	body[body.length - 1],
			lftSib:		((obody)[0] || emptyObj).el,
			rgtSib:		(obody[obody.length - 1] || emptyObj).el,
		};

	converge:
	while (1) {
//		from_left:
		while (1) {
			var l = syncLft(node, parEl, body, state, null);
			if (l === BREAK) break;
			if (l === BREAK_ALL) break converge;
		}

//		from_right:
		while (1) {
			var r = syncRgt(node, parEl, body, state, state.lftNode);
			if (r === BREAK) break;
			if (r === BREAK_ALL) break converge;
		}

		var newSibs;

		if (newSibs = headTailTry(parEl, state.lftSib, state.lftNode, state.rgtSib, state.rgtNode)) {
			state.lftSib = newSibs.lftSib;
			state.rgtSib = newSibs.rgtSib;
			continue;
		}

		sortDOM(node, parEl, body);
		break;
	}
}

// lft, rgt, fromIdx, toIdx
function sortDOM(node, parEl, body) {
	// static list of all dom nodes, should this operate only within already established bounds?
	var kids = Array.prototype.slice.call(parEl.childNodes);
	var domIdxs = [];

	for (var k = 0; k < kids.length; k++) {
		var n = kids[k]._node;

		if (n.parent === node)
			domIdxs.push(n.idx);
	}

	// list of non-movable vnode indices (already in correct order in old dom)
	var tombs = longestIncreasingSubsequence(domIdxs).map(i => domIdxs[i]);

	for (var i = 0; i < tombs.length; i++)
		body[tombs[i]]._lis = true;

	var lftSib = parEl.firstChild;
	var lftNode = body[0];
	var lsNode = null;
	var tmpSib;

	while (1) {
		if (lftSib) {
			if ((lsNode = lftSib._node) == null) {
				if (_DEVMODE)
					devNotify("FOREIGN_ELEMENT", [lftSib]);

				lftSib = nextSib(lftSib);
				continue;
			}

			if (parentNode(lsNode) !== node) {
				tmpSib = nextSib(lftSib);
				lsNode.vm != null ? lsNode.vm.unmount(true) : removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lsNode._lis) {
				lftSib = nextSib(lftSib);
				continue;
			}
		}

		if (lftNode == null)
			break;
		else if (lftNode.el == null) {
			insertBefore(parEl, hydrate(lftNode), lftSib);
			lftNode = nextNode(lftNode, body);
		}
		else if (lftNode.el === lftSib) {
			lftNode = nextNode(lftNode, body);
			lftSib = nextSib(lftSib);
		}
		else {
			if (lftSib) {	// && !lis
				// find closest tomb
				var t = binaryFindLarger(lsNode.idx, tombs);
				lsNode._lis = true;
				tmpSib = nextSib(lftSib);
				insertBefore(parEl, lftSib, t != null ? body[tombs[t]].el : t);
				tombs.splice(t, 0, lsNode.idx);
				lftSib = tmpSib;
				continue;
			}

			if (_DEVMODE) {
				if (lftNode.vm != null)
					devNotify("ALREADY_HYDRATED", [lftNode.vm]);
			}
			break;
		}
	}
}