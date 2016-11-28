import { ELEMENT, TEXT, COMMENT, FRAGMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr } from '../utils';
import { views } from './ViewModel';
import { isStyleProp, isSplProp, isEvProp, isDynProp } from './utils';
import { isStream, hookStream } from './addons/stubs';
import { setAttr } from './patchAttrs';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';
import { createView } from './createView';
import { createElement, createTextNode, createComment, createFragment, insertBefore } from './dom';


// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);

		if (isStream(nval))
			nattrs[key] = nval = hookStream(nval, vnode.vm());

		if (isStyleProp(key))
			patchStyle(vnode);
		else if (isSplProp(key)) {}
		else if (isEvProp(key))
			patchEvent(vnode, key, nval);
		else if (nval != null)
			setAttr(vnode, key, nval, isDyn);
	}
}

export function hydrateBody(vnode) {
	for (var i = 0; i < vnode.body.length; i++) {
		var vnode2 = vnode.body[i];
		var type2 = vnode2.type;

		if (type2 == ELEMENT || type2 == TEXT || type2 == COMMENT || type2 == FRAGMENT)
			insertBefore(vnode.el, hydrate(vnode2));		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 == VVIEW) {
			var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new model updates
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 == VMODEL) {
			var vm = views[vnode2.vmid];
			vm._redraw(vnode, i);					// , false
			insertBefore(vnode.el, vm.node.el);		// , hydrate(vm.node)
		}
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
export function hydrate(vnode, withEl) {
	if (vnode.el == null) {
		if (vnode.type == ELEMENT) {
			vnode.el = withEl || createElement(vnode.tag);

			if (vnode.attrs != null)
				patchAttrs2(vnode);

			if (isArr(vnode.body))
				hydrateBody(vnode);
			else if (vnode.body != null && vnode.body !== "") {
				if (vnode.raw)
					vnode.el.innerHTML = vnode.body;
				else
					vnode.el.textContent = vnode.body;
			}
		}
		else if (vnode.type == TEXT)
			vnode.el = withEl || createTextNode(vnode.body);
		else if (vnode.type == COMMENT)
			vnode.el = withEl || createComment(vnode.body);
		else if (vnode.type == FRAGMENT) {
			vnode.el = withEl || createFragment();
			hydrateBody(vnode);
		}
	}

	vnode.el._node = vnode;

	return vnode.el;
}