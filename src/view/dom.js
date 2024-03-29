import { doc, isArr, isProm, curry } from '../utils';
import { fireHook } from './hooks';
import { FIXED_BODY, DEEP_REMOVE } from './initElementNode';

export function createElement(tag, ns) {
	if (ns != null)
		return doc.createElementNS(ns, tag);
	return doc.createElement(tag);
}

export function createTextNode(body) {
	return doc.createTextNode(body);
}

export function createComment(body) {
	return doc.createComment(body);
}

// ? removes if !recycled
export function nextSib(sib) {
	return sib.nextSibling;
}

// ? removes if !recycled
export function prevSib(sib) {
	return sib.previousSibling;
}

// TODO: this should collect all deep proms from all hooks and return Promise.all()
function deepNotifyRemove(node) {
	var vm = node.vm;

	var wuRes = vm != null && fireHook(vm.hooks, "willUnmount", vm, vm.data);

	var wrRes = fireHook(node.hooks, "willRemove", node);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE && isArr(node.body)) {
		for (var i = 0; i < node.body.length; i++)
			deepNotifyRemove(node.body[i]);
	}

	return wuRes || wrRes;
}

function deepUnref(node, self) {
	if (self) {
		var vm = node.vm;

		if (vm != null)
			vm.node = vm.refs = null;
	}

	var obody = node.body;

	if (isArr(obody)) {
		for (var i = 0; i < obody.length; i++)
			deepUnref(obody[i], true);
	}
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, vm = node.vm;

	deepUnref(node, true);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE) {
		for (var i = 0; i < node.body.length; i++)
			_removeChild(el, node.body[i].el);
	}

	delete el._node;

	parEl.removeChild(el);

	fireHook(node.hooks, "didRemove", node, null, immediate);

	if (vm != null) {
		fireHook(vm.hooks, "didUnmount", vm, vm.data, immediate);
		vm.node = null;
	}
}

// todo: should delay parent unmount() by returning res prom?
export function removeChild(parEl, el) {
	var node = el._node;

	// immediately remove foreign dom nodes
	if (node == null)
		parEl.removeChild(el);
	else {
		// already marked for removal
		if (node._dead) return;

		var res = deepNotifyRemove(node);

		if (res != null && isProm(res)) {
			node._dead = true;
			res.then(curry(_removeChild, [parEl, el, true]));
		}
		else
			_removeChild(parEl, el);
	}
}

export function clearChildren(parent) {
	var parEl = parent.el;

	if ((parent.flags & DEEP_REMOVE) === 0) {
		deepUnref(parent, false);
		parEl.textContent = null;
	}
	else {
		var el = parEl.firstChild;

		if (el != null) {
			do {
				var next = nextSib(el);
				removeChild(parEl, el);
			} while (el = next);
		}
	}
}

// todo: hooks
export function insertBefore(parEl, el, refEl) {
	var node = el._node, inDom = el.parentNode != null;

	// el === refEl is asserted as a no-op insert called to fire hooks
	var vm = (el === refEl || !inDom) ? node.vm : null;

	if (vm != null)
		fireHook(vm.hooks, "willMount", vm, vm.data);

	fireHook(node.hooks, inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	fireHook(node.hooks, inDom ? "didReinsert" : "didInsert", node);

	if (vm != null)
		fireHook(vm.hooks, "didMount", vm, vm.data);
}

export function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}