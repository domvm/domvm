import { isArr, isProm, curry } from '../utils';
import { fireHooks } from './hooks';
import { views } from './ViewModel';
import { FIXED_BODY, FAST_REMOVE } from './defineElement';

const doc = document;

export function createElement(tag) {
	return doc.createElement(tag);
}

export function createTextNode(body) {
	return doc.createTextNode(body);
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
	var hooks = node.hooks;
	var vm = node.vmid != null ? node.vm() : null;

	vm && vm.hooks && fireHooks("willUnmount", vm);

	var res = hooks && fireHooks("willRemove", node);

	if (!(node.flags & FAST_REMOVE) && isArr(node.body))
		node.body.forEach(deepNotifyRemove);

	return res;
}

function _removeChild(parEl, el, immediate) {
	var node = el._node, hooks = node.hooks;

	var vm = node.vmid != null ? node.vm() : null;

//	if (node.ref != null && node.ref[0] == "^")			// this will fail for fixed-nodes?
//		console.log("clean exposed ref", node.ref);

	if (!(node.flags & FAST_REMOVE) && isArr(node.body)) {
	//	var parEl = node.el;
		for (var i = 0; i < node.body.length; i++)
			_removeChild(el, node.body[i].el);
	}

	parEl.removeChild(el);

	hooks && fireHooks("didRemove", node, null, immediate);

	vm && vm.hooks && fireHooks("didUnmount", vm, null, immediate);
}

// todo: should delay parent unmount() by returning res prom?
export function removeChild(parEl, el) {
	var node = el._node, hooks = node.hooks;

	var res = deepNotifyRemove(node);

	if (res != null && isProm(res))
		res.then(curry(_removeChild, [parEl, el, true]));
	else
		_removeChild(parEl, el);
}

// todo: hooks
export function insertBefore(parEl, el, refEl) {
	var node = el._node, hooks = node.hooks, inDom = el.parentNode;

	var vm = !inDom && node.vmid != null ? node.vm() : null;

	vm && vm.hooks && fireHooks("willMount", vm);

	// this first happens during view creation, but if view is
	// ever unmounted & remounted later, need to re-register
	vm && (views[vm.id] = vm);

	hooks && fireHooks(inDom ? "willReinsert" : "willInsert", node);
	parEl.insertBefore(el, refEl);
	hooks && fireHooks(inDom ? "didReinsert" : "didInsert", node);

	vm && vm.hooks && fireHooks("didMount", vm);
}

export function insertAfter(parEl, el, refEl) {
	insertBefore(parEl, el, refEl ? nextSib(refEl) : null);
}