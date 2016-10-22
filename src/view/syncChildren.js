import { hydrate } from './hydrate';
import { isArr, isFunc, isProm, startsWith, curry } from '../utils';
import { repaint } from './utils';

//import { DEBUG } from './DEBUG';

export const didQueue = [];

function fireHook(did, fn, o, n, immediate) {
	if (did) {	// did*
		//	console.log(name + " should queue till repaint", o, n);
		immediate ? repaint(o.parent) && fn(o, n) : didQueue.push([fn, o, n]);
	}
	else {		// will*
		//	console.log(name + " may delay by promise", o, n);
		return fn(o, n);		// or pass  done() resolver
	}
}

export function fireHooks(name, o, n, immediate) {
	var hook = o.hooks[name];

	if (hook) {
		var did = startsWith(name, "did");

		if (isArr(hook)) {
			// TODO: promise.all() this?
			return hook.map(function(hook2) {
				return fireHook(did, hook2, o, n);
			});
		}
		else
			return fireHook(did, hook, o, n, immediate);
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

	var res = hooks && fireHooks("willRemove", node);

	if (res != null && isProm(res))
		res.then(curry(_removeChild, [parEl, el, true]));
	else
		_removeChild(parEl, el);
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, hooks = node.hooks;

//	if (node.ref != null && node.ref[0] == "^")			// this will fail for fixed-nodes?
//		console.log("clean exposed ref", node.ref);

	if (isArr(node.body)) {
	//	var parEl = node.el;
		for (var i = 0; i < node.body.length; i++)
			removeChild(el, node.body[i].el);
	}

	parEl.removeChild(el);

	hooks && fireHooks("didRemove", node, null, immediate);
}

// todo: hooks
export function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;
	hooks && fireHooks(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? "didReinsert" : "didInsert", node);
}

function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
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
			if (lftSib)
				var lsNode = lftSib._node;

			// remove any non-recycled sibs whose el.node has the old parent
			if (lftSib && !lsNode.recycled && lsNode.parent != parEl._node) {
				tmpSib = nextSib(lftSib);
				lsNode.vmid != null ? lsNode.vm.unmount(true) : removeChild(parEl, lftSib);
				lftSib = tmpSib;
				continue;
			}

			if (lftNode == null)		// reached end
				break converge;
			else if (lftNode.el == null) {
				insertBefore(parEl, hydrate(lftNode), lftSib);		// or vmid mount?
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
			if (rgtSib)
				var rsNode = rgtSib._node;

			if (rgtSib && !rsNode.recycled && rsNode.parent != parEl._node) {
				tmpSib = prevSib(rgtSib);
				rsNode.vmid != null ? rsNode.vm.unmount(true) : removeChild(parEl, rgtSib);
				rgtSib = tmpSib;
				continue;
			}

			if (rgtNode == lftNode)		// converged
				break converge;
			if (rgtNode.el == null) {
				insertAfter(parEl, hydrate(rgtNode), rgtSib);		// or vmid mount?
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