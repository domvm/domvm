import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isVal, isArr, isFunc, insertArr, deepSet } from '../utils';
import { isStream, streamVal } from '../streamCfg';
import { hookStream } from './utils';

function setRef(vm, name, node) {
	var path = ["refs"].concat(name.replace("^", "").split("."));

	deepSet(vm, path, node);

	// bubble
	var par;
	if (name[0] == "^" && (par = vm.parent()))
		setRef(par, name, node);
}

// vnew, vold
export function preProc(vnew, parent, idx, ownVmid, extKey) {		// , parentVm
	// injected views
	if (vnew.type === VMODEL) {
		// pull vm.node out & reassociate
		// redraw?
	}
	else if (vnew.type === VVIEW) {

	}
	// injected and declared elems/text/comments
	else {
		vnew.parent = parent;
		vnew.idx = idx;
		vnew.vmid = ownVmid;

		// set external ref eg vw(MyView, data, "^moo")
		if (extKey != null && typeof extKey == "string" && extKey[0] == "^")
			vnew.ref = extKey;

		if (vnew.ref != null)
			setRef(vnew.vm(), vnew.ref, vnew);

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
				else if (node2.type === TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body === "")
						body.splice(i--, 1);
					// merge with previous text node
					else if (i > 0 && body[i-1].type === TEXT) {
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
		else if (isStream != null && isStream(vnew.body))
			vnew.body = hookStream(vnew.body, vnew.vm());
	}
}