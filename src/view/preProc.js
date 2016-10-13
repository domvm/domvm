import { VTYPE } from './VTYPE';
import { isArr, isFunc, insertArr } from '../utils';

function setRef(vm, name, node) {
	if (vm.refs == null)
		vm.refs = {};

//	if (name[0] == "^")		// gotta be careful with cleanup of these

	var path = name.split("."), seg;

	var refs = vm.refs;

	while (seg = path.shift()) {
		if (path.length == 0)
			refs[seg] = node;
		else
			refs[seg] = refs = {};
	}
}

// vnew, vold
export function preProc(vnew, parent, idx, ownVmid) {		// , parentVm
//	console.count("x");

//	this.update(model, parent, idx, parentVm, false);

	// should this be opt-in?


//	this._parent = parentVm;
//	parentVm._body.push(this);		// if parentVm._body

	// switch (vnode._type) {}
	// TYPE_ELEM
	// TYPE_TEXT
	// TYPE_VIEW
	// TYPE_COMMENT

	// TYPE_EXTVIEW
	// TYPE_EXTELEM
	// declarative views


	// injected views
	if (vnew._type === VTYPE.VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew._type === VTYPE.VVIEW) {

	}
	// injected and declared elems/text/comments
	else {
		vnew._parent = parent;
		vnew._idx = idx;
		vnew._vmid = ownVmid;

		var attrs = vnew._attrs;
		if (attrs) {
			if (attrs._ref != null)
				setRef(vnew._vm, attrs._ref, vnew);		// _vm getter traverses up each time, can optimize by passing parentVm through to here
		}

		if (isArr(vnew._body)) {
		// declarative elems, comments, text nodes
			var body = vnew._body;

			for (var i = 0; i < body.length; i++) {
				var node2 = body[i];

//				if (isFunc(node2))
//					node2 = body[i] = node2();

				// remove null/undefined
				if (node2 == null)
					body.splice(i--, 1);
				// flatten arrays
				else if (isArr(node2))
					insertArr(body, node2, i--, 1);
				else if (node2._type === VTYPE.TEXT) {
					// remove empty text nodes
					if (node2._body == null || node2._body === "")
						body.splice(i--, 1);
					// merge with previous text node
					else if (i > 0 && body[i-1]._type === VTYPE.TEXT) {
						body[i-1]._body += node2._body;
						body.splice(i--, 1);
					}
					else
						preProc(node2, vnew, i);		// , /*vnew._vm ||*/ parentVm
				}
				else {
			//		if (node2._ref != null)
			//			parentVm._setRef(node2._ref, node2);

					preProc(node2, vnew, i);			// , /*vnew._vm ||*/ parentVm
	/*
					// init/populate keys in in parent
					if (node2._key != null) {
						if (vnew._keys == null)
							vnew._keys = {};

						vnew._keys[node2._key] = i;
					}
	*/
				}
			}
		}
	}

//		else if (vnew._type === TYPE_TEXT) {}
//		else if (vnew._type === TYPE_COMMENT) {}
}