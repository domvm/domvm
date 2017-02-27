import { TEXT, VVIEW, VMODEL } from './VTYPES';
import { defineText } from './defineText';
import { isVal, isArr, isFunc, insertArr, deepSet } from '../utils';
import { isStream, hookStream } from './addons/stubs';

function setRef(vm, name, node) {
	var path = ["refs"].concat(name.split("."));
	deepSet(vm, path, node);
}

// vnew, vold
export function preProc(vnew, parent, idx, ownVmid) {
	if (vnew.type == VMODEL || vnew.type == VVIEW)
		return;

	vnew.parent = parent;
	vnew.idx = idx;
	vnew.vmid = ownVmid;

	if (vnew.ref != null)
		setRef(vnew.vm(), vnew.ref, vnew);

	if (isArr(vnew.body)) {
		// declarative elems, comments, text nodes
		var body = vnew.body;

		for (var i = 0; i < body.length; i++) {
			var node2 = body[i];

			// remove false/null/undefined
			if (node2 === false || node2 == null)
				body.splice(i--, 1);
			// flatten arrays
			else if (isArr(node2))
				insertArr(body, node2, i--, 1);
			else {
				if (node2.type == null)
					body[i] = node2 = defineText(""+node2);

				if (node2.type == TEXT) {
					// remove empty text nodes
					if (node2.body == null || node2.body == "")
						body.splice(i--, 1);
					// merge with previous text node
					else if (i > 0 && body[i-1].type == TEXT) {
						body[i-1].body += node2.body;
						body.splice(i--, 1);
					}
					else
						preProc(node2, vnew, i, null);
				}
				else
					preProc(node2, vnew, i, null);
			}
		}
	}
	else if (isStream(vnew.body))
		vnew.body = hookStream(vnew.body, vnew.vm());
}