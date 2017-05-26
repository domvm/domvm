import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr, emptyObj } from '../utils';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { LAZY_BODY } from './initElementNode';
//import { XML_NS, XLINK_NS } from './defineSvgElement';
import { createElement, createTextNode, createComment, insertBefore } from './dom';

export function hydrateBody(vnode) {
	for (var i = 0; i < vnode.body.length; i++) {
		var vnode2 = vnode.body[i];
		var type2 = vnode2.type;

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT)
			insertBefore(vnode.el, hydrate(vnode2));		// vnode.el.appendChild(hydrate(vnode2))
		else if (type2 === VVIEW) {
			var vm = createView(vnode2.view, vnode2.model, vnode2.key, vnode2.opts)._redraw(vnode, i, false);		// todo: handle new model updates
			type2 = vm.node.type;
			insertBefore(vnode.el, hydrate(vm.node));
		}
		else if (type2 === VMODEL) {
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
		if (vnode.type === ELEMENT) {
			vnode.el = withEl || createElement(vnode.tag, vnode.ns);

		//	if (vnode.tag === "svg")
		//		vnode.el.setAttributeNS(XML_NS, 'xmlns:xlink', XLINK_NS);

			if (vnode.attrs != null)
				patchAttrs(vnode, emptyObj, true);

			if ((vnode.flags & LAZY_BODY) === LAZY_BODY)	// vnode.body instanceof LazyBody
				vnode.body.body(vnode);

			if (isArr(vnode.body))
				hydrateBody(vnode);
			else if (vnode.body != null && vnode.body !== "") {
				if (vnode.raw)
					vnode.el.innerHTML = vnode.body;
				else
					vnode.el.textContent = vnode.body;
			}
		}
		else if (vnode.type === TEXT)
			vnode.el = withEl || createTextNode(vnode.body);
		else if (vnode.type === COMMENT)
			vnode.el = withEl || createComment(vnode.body);
	}

	vnode.el._node = vnode;

	return vnode.el;
}