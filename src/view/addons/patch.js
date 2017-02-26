import { assignObj } from '../../utils';
import { patchAttrs } from '../patchAttrs';
import { preProc } from '../preProc';
import { patch as fullPatch } from '../patch';
import { drainDidHooks } from '../ViewModel';

import { VNodeProto } from '../VNode';

VNodeProto.patch = function(n) {
	return patch(this, n);
};

// newNode can be either {class: style: } or full new VNode
// will/didPatch hooks?
export function patch(o, n) {
	if (n.type != null) {
		// no full patching of view roots, just use redraw!
		if (o.vmid != null)
			return;

		preProc(n, o.parent, o.idx, null);
		o.parent.body[o.idx] = n;
//		o.parent = o.el = o.body = null;		// helps gc?
		fullPatch(n, o);
		drainDidHooks(n.vm());
	}
	else {
		// TODO: re-establish refs

		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);
		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, n);
		// prepend any fixed shorthand class
		if (o._class != null) {
			var aclass = oattrs.class;
			oattrs.class = aclass != null && aclass != "" ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}