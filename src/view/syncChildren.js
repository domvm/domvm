import { emptyObj } from '../utils';
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

		newSibs = sortDOM(parEl, state.lftSib, state.rgtSib, cmpElNodeIdx);
		state.lftSib = newSibs.lftSib;
		state.rgtSib = newSibs.rgtSib;
	}
}