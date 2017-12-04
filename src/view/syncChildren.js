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

const BREAK = 1;
const BREAK_ALL = 2;

function syncDir(advSib, advNode, insert, sibName, nodeName) {
	return function(node, parEl, body, state, convTest, lis) {
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

			if (lis && state[sibName]) {
				if (sibNode._lis) {
					insert(parEl, state[nodeName].el, state[sibName]);
					state[nodeName] = advNode(state[nodeName], body);
					return;
				}

				// find closest tomb
				var t = binaryFindLarger(sibNode.idx, state.tombs);
				sibNode._lis = true;
				tmpSib = nextSib(state[sibName]);
				insert(parEl, state[sibName], t != null ? body[state.tombs[t]].el : t);

				if (t == null)
					state.tombs.push(sibNode.idx);
				else
					state.tombs.splice(t, 0, sibNode.idx);

				state[sibName] = tmpSib;
				return;
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
			var l = syncLft(node, parEl, body, state, null, false);
			if (l === BREAK) break;
			if (l === BREAK_ALL) break converge;
		}

//		from_right:
		while (1) {
			var r = syncRgt(node, parEl, body, state, state.lftNode, false);
			if (r === BREAK) break;
			if (r === BREAK_ALL) break converge;
		}

		var areAdjacent	= state.rgtNode.idx === state.lftNode.idx + 1;
		var headToTail = areAdjacent ? false : state.lftSib._node === state.rgtNode;
		var tailToHead = areAdjacent ? true  : state.rgtSib._node === state.lftNode;

		if (headToTail || tailToHead) {
			// get outer immute edges
			var lftLft = prevSib(state.lftSib);
			var rgtRgt = nextSib(state.rgtSib);

			if (tailToHead)
				insertBefore(parEl, state.rgtSib, state.lftSib);

			if (headToTail)
				insertBefore(parEl, state.lftSib, rgtRgt);

			state.lftSib = lftLft ? nextSib(lftLft) : parEl.firstChild;
			state.rgtSib = rgtRgt ? prevSib(rgtRgt) : parEl.lastChild;
			continue;
		}

		sortDOM(node, parEl, body, state);
		break;
	}
}

// TODO: also use the state.rgtSib and state.rgtNode bounds, plus reduce LIS range
function sortDOM(node, parEl, body, state) {
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

	state.tombs = tombs;

	while (1) {
		var r = syncLft(node, parEl, body, state, null, true);
		if (r === BREAK_ALL) break;
	}
}