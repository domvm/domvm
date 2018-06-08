import { VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr } from '../../utils';
import { isStyleAttr, isSplAttr, isEvAttr, isDynAttr } from '../utils';
import { patchEvent } from '../patchEvent';
import { setAttr } from '../patchAttrs';
import { LAZY_LIST } from '../initElementNode';
import { devNotify, DEVMODE } from "./devmode";

export function protoAttach(el) {
	var vm = this;
	if (vm.node == null)
		vm._redraw(null, null, false)

	attach(vm.node, el);

	return vm;
};

// very similar to hydrate, TODO: dry
function attach(vnode, withEl) {
	vnode.el = withEl;
	withEl._node = vnode;

	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynAttr(vnode.tag, key);

		if (isStyleAttr(key) || isSplAttr(key)) {}
		else if (isEvAttr(key))
			patchEvent(vnode, key, nval);
		else if (nval != null && isDyn)
			setAttr(vnode, key, nval, isDyn);
	}

	if ((vnode.flags & LAZY_LIST) === LAZY_LIST)
		vnode.body.body(vnode);

	if (isArr(vnode.body) && vnode.body.length > 0) {
		var c = withEl.firstChild;
		var i = 0;
		var v = vnode.body[i];
		do {
			if (v.type === VVIEW)
				v = createView(v.view, v.data, v.key, v.opts)._redraw(vnode, i, false).node;
			else if (v.type === VMODEL)
				v = v.node || v._redraw(vnode, i, false).node;

			if (_DEVMODE) {
				if (vnode.tag === "table" && v.tag === "tr") {
					devNotify("ATTACH_IMPLICIT_TBODY", [vnode, v]);
				}
			}

			attach(v, c);
		} while ((c = c.nextSibling) && (v = vnode.body[++i]))
	}
}