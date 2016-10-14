import { hydrate } from './hydrate';
import { isArr, isFunc, isProm, startsWith } from '../utils';
//import { DEBUG } from './DEBUG';

export const didQueue = [];

function fireHook(did, fn, o, n, then) {
	if (did) {	// did*
		//	console.log(name + " should queue till repaint", o, n);
		didQueue.push([fn, o, n]);
	}
	else {		// will*
		//	console.log(name + " may delay by promise", o, n);
		var res = fn(o, n);		// or pass  done() resolver

		if (isProm(res))
			res.then(then);
	}
}

export function fireHooks(name, o, n, then) {
	var hook = o.hooks[name];

	if (hook) {
		var did = startsWith(name, "did");

		if (isArr(hook)) {
			hook.forEach(function(hook2) {
				fireHook(did, hook2, o, n, then);
			})
		}
		else
			fireHook(did, hook, o, n, then);
	}
}

function nextNode(node, body) {
	return body[node.idx + 1];
}

function prevNode(node, body) {
	return body[node.idx - 1];
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
export function removeChild(parEl, el) {
	var node = el._node, hooks = node.hooks;

	hooks && fireHooks("willRemove", node);

	if (isArr(node.body)) {
	//	var parEl = node.el;
		for (var i = 0; i < node.body.length; i++)
			removeChild(el, node.body[i].el);
	}

	parEl.removeChild(el);

	hooks && fireHooks("didRemove", node);
}

const willInsert = "willInsert";
const didInsert = "didInsert";
const willReinsert = "willReinsert";
const didReinsert = "didReinsert";

// todo: hooks
export function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;
	hooks && fireHooks(inDom ? willReinsert : willInsert, node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? didReinsert : didInsert, node);
}

function insertAfter(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;
	hooks && fireHooks(inDom ? willReinsert : willInsert, node);
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
	hooks && fireHooks(inDom ? didReinsert : didInsert, node);
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
	return a._node.idx - b._node.idx;
}

export function syncChildren(node, parEl) {
	var body = node.body;
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
//		from_left:
		while (1) {
			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib && !lftSib._node.recycled && lftSib._node.parent != parEl._node) {
				tmpSib = nextSib(lftSib);
				removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				break converge;
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);
				lftNode = nextNode(lftNode, body);
			}
			else if (lftNode.el === lftSib) {
				lftNode = nextNode(lftNode, body);
				lftSib = nextSib(lftSib);
			}
			else
				break;
		}

//		DEBUG && console.log("from_right");
//		from_right:
		while(1) {
			if (rgtSib && !rgtSib._node.recycled && rgtSib._node.parent != parEl._node) {
				tmpSib = prevSib(rgtSib);
				removeChild(parEl, rgtSib);
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				break converge;
			if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);
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