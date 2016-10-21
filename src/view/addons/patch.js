import { assignObj } from '../../utils';
import { patchAttrs } from '../patchAttrs';

import { VNodeProto } from '../VNode';

VNodeProto.patch = function(n) {
	return patch(this, n);
};

// newNode can be either {class: style: } or full new VNode
// will/didPatch?
export function patch(o, n) {
	if (n.type != null) {
		// full new node
	}
	else {
		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);
		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, donor.attrs, n);
		// prepend any fixed shorthand class
		if (o._class != null) {
			var aclass = oattrs.class;
			oattrs.class = aclass != null && aclass != "" ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}