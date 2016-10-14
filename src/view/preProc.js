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
	// injected views
	if (vnew.type === VTYPE.VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew.type === VTYPE.VVIEW) {

	}
	// injected and declared elems/text/comments
	else {
		vnew.parent = parent;
		vnew.idx = idx;
		vnew.vmid = ownVmid;

		var attrs = vnew.attrs;
		if (attrs) {
			if (attrs._ref != null)
				setRef(vnew.vm, attrs._ref, vnew);		// _vm getter traverses up each time, can optimize by passing parentVm through to here
		}

		if (isArr(vnew.body)) {
		// declarative elems, comments, text nodes
			var body = vnew.body;

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
				else if (node2.type === VTYPE.TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body === "")
						body.splice(i--, 1);
					// merge with previous text node
					else if (i > 0 && body[i-1].type === VTYPE.TEXT) {
						body[i-1].body += node2.body;
						body.splice(i--, 1);
					}
					else
						preProc(node2, vnew, i);		// , /*vnew.vm ||*/ parentVm
				}
				else {
			//		if (node2.ref != null)
			//			parentVm.setRef(node2.ref, node2);

					preProc(node2, vnew, i);			// , /*vnew.vm ||*/ parentVm
	/*
					// init/populate keys in in parent
					if (node2.key != null) {
						if (vnew.keys == null)
							vnew.keys = {};

						vnew.keys[node2.key] = i;
					}
	*/
				}
			}
		}
	}
}