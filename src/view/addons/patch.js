import { assignObj } from '../../utils';
import { getVm } from '../utils';
import { patchAttrs } from '../patchAttrs';
import { preProc } from '../preProc';
import { patch as fullPatch } from '../patch';
import { drainDidHooks } from '../hooks';

export function protoPatch(n) {
	return patch(this, n);
}

// newNode can be either {class: style: } or full new VNode
// will/didPatch hooks?
export function patch(o, n) {
	if (n.type != null) {
		// no full patching of view roots, just use redraw!
		if (o.vm != null)
			return;

		preProc(n, o.parent, o.idx, null);
		o.parent.body[o.idx] = n;
		fullPatch(n, o);
		drainDidHooks(getVm(n));
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
			oattrs.class = aclass != null && aclass !== "" ? o._class + " " + aclass : o._class;
		}

		patchAttrs(o, donor);
	}
}