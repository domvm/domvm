import { VVIEW, VMODEL } from '../VTYPES';
import { createView } from '../createView';
import { isArr } from '../../utils';
import { isStyleProp, isSplProp, isEvProp, isDynProp } from '../utils';
import { patchEvent } from '../patchEvent';
import { setAttr } from '../patchAttrs';

import { ViewModelProto } from '../ViewModel';

ViewModelProto.attach = function(el) {
	var vm = this;
	if (vm.node == null)
		vm._redraw(null, null, false)

	attach(vm.node, el);

	return vm;
};

// very similar to hydrate, TODO: dry
export function attach(vnode, withEl) {
	vnode.el = withEl;
	withEl._node = vnode;

	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);

		if (isStyleProp(key) || isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key, nval);
		else if (nval != null && isDyn)
			setAttr(vnode, key, nval, isDyn);
	}

	if (isArr(vnode.body)) {
		var c = withEl.firstChild;
		var i = 0;
		var v = vnode.body[i];
		do {
			if (v.type === VVIEW)
				v = createView(v.view, v.model, v.key, v.opts)._redraw(vnode, i, false).node;
			else if (v.type === VMODEL)
				v = v.node || v._redraw(vnode, i, false).node;

			attach(v, c);
		} while ((c = c.nextSibling) && (v = vnode.body[++i]))
	}
}