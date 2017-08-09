import { ENV_DOM, isArr, isProm, curry } from '../utils';
import { fireHook } from './hooks';
import { FIXED_BODY, DEEP_REMOVE } from './initElementNode';

const doc = ENV_DOM ? document : null;

export function closestVNode(el) {
	while (el._node == null)
		el = el.parentNode;
	return el._node;
}

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
	var hooks = node.hooks, vm = node.vm;

	var wuRes = vm && vm.hooks && fireHook("willUnmount", vm, vm.data);

	var wrRes = hooks && fireHook("willRemove", node);

	if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE && isArr(node.body)) {
		for (var i = 0; i < node.body.length; i++)
			deepNotifyRemove(node.body[i]);
	}

	return wuRes || wrRes;
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, hooks = node.hooks, vm = node.vm;

	if (isArr(node.body)) {
		if ((node.flags & DEEP_REMOVE) === DEEP_REMOVE) {
			for (var i = 0; i < node.body.length; i++)
				_removeChild(el, node.body[i].el);
		}
		else
			deepUnref(node);
	}

	parEl.removeChild(el);

	el._node = null;

	hooks && fireHook("didRemove", node, null, immediate);

	vm && vm.hooks && fireHook("didUnmount", vm, vm.data, immediate);
}

// todo: should delay parent unmount() by returning res prom?
export function removeChild(parEl, el) {
	var node = el._node, hooks = node.hooks;

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

function deepUnref(node) {
	var obody = node.body;
	for (var i = 0; i < obody.length; i++) {
		var o2 = obody[i];
		o2.el._node = null;
		if (isArr(o2.body))
			deepUnref(o2);
	}
}

export function clearChildren(parent) {
	var parEl = parent.el;

	if ((parent.flags & DEEP_REMOVE) === 0) {
		isArr(parent.body) && deepUnref(parent);
		parEl.textContent = null;
	}
	else {
		var el = parEl.firstChild;

		do {
			var next = nextSib(el);
			removeChild(parEl, el);
		} while (el = next);
	}
}

// todo: hooks
export function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode != null;

	// el === refEl is asserted as a no-op insert called to fire hooks
	var vm = (el === refEl || !inDom) && node.vm;

	vm && vm.hooks && fireHook("willMount", vm, vm.data);

	hooks && fireHook(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHook(inDom ? "didReinsert" : "didInsert", node);

	vm && vm.hooks && fireHook("didMount", vm, vm.data);
}

export function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}