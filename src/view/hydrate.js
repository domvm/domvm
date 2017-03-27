import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr } from '../utils';
import { isStyleProp, isSplProp, isEvProp, isDynProp, getVm } from './utils';
import { isStream, hookStream } from './addons/stubs';
import { setAttr } from './patchAttrs';
import { patchStyle } from './patchStyle';
import { patchEvent } from './patchEvent';
import { createView } from './createView';
//import { XML_NS, XLINK_NS } from './defineSvgElement';
import { createElement, createTextNode, createComment, insertBefore } from './dom';

// TODO: DRY this out. reusing normal patchAttrs here negatively affects V8's JIT
function patchAttrs2(vnode) {
	var nattrs = vnode.attrs;

	for (var key in nattrs) {
		var nval = nattrs[key];
		var isDyn = isDynProp(vnode.tag, key);

		if (isStream(nval))
			nattrs[key] = nval = hookStream(nval, getVm(vnode));

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

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT)
			insertBefore(vnode.el, hydrate(vnode2));		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 == VVIEW) {
			var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new model updates
			type2 = vm.node.type;
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 == VMODEL) {
			var vm = vnode2.vm;
			vm._redraw(vnode, i);					// , false
			type2 = vm.node.type;
			insertBefore(vnode.el, vm.node.el);		// , hydrate(vm.node)
		}
	}
}

//  TODO: DRY this out. reusing normal patch here negatively affects V8's JIT
export function hydrate(vnode, withEl) {
	if (vnode.el == null) {
		if (vnode.type == ELEMENT) {
			vnode.el = withEl || createElement(vnode.tag, vnode.ns);

		//	if (vnode.tag == "svg")
		//		vnode.el.setAttributeNS(XML_NS, 'xmlns:xlink', XLINK_NS);

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
	}

	vnode.el._node = vnode;

	return vnode.el;
}