import { VTYPE } from './VTYPE';
import { isArr, isFunc } from '../utils';
import { isStyleProp, isSplProp, isEvProp } from './utils';
import { setAttr } from './attrs';
import { patchStyle, patchEvent } from './patch';
import { views, createView } from './createView';

/*
import { patchAttrs2 } from './patch';
import { VNode } from './VNode';
const fakeDonor = new VNode(VTYPE.ELEMENT);
fakeDonor._attrs = {};
*/

// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode._attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];

		if (isStyleProp(key))
			patchStyle(vnode);
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key.substr(2), null, nval);
		else if (nval != null)
			setAttr(vnode, key, nval);
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
export function hydrate(vnode, withEl) {
	if (vnode._el == null) {
		if (vnode._type === VTYPE.ELEMENT) {
			vnode._el = withEl || document.createElement(vnode._tag);

			if (vnode._attrs)
				patchAttrs2(vnode);

			if (isArr(vnode._body)) {
				vnode._body.forEach((vnode2, i) => {
					if (vnode2._type == VTYPE.VMODEL) {
						var vm = views[vnode2._vmid];
						vm._redraw(vnode, i);
						vnode._el.insertBefore(vm._node._el, null)
					}
					else if (vnode2._type == VTYPE.VVIEW) {
						var vm = createView(vnode2._view, vnode2._model, vnode2._key, vnode2._opts)._redraw(vnode, i);		// todo: handle new model updates
						vnode._el.insertBefore(vm._node._el, null)
					}
					else
						vnode._el.insertBefore(hydrate(vnode2), null);		// vnode._el.appendChild(hydrate(vnode2))
				})
			}
			else if (vnode._body != null && vnode._body !== "") {
				if (vnode._html)
					vnode._el.innerHTML = vnode._body;
				else
					vnode._el.textContent = vnode._body;
			}
		}
		else if (vnode._type === VTYPE.TEXT)
			vnode._el = withEl || document.createTextNode(vnode._body);
	}

	vnode._el._node = vnode;

	return vnode._el;
}