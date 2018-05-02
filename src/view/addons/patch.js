import { assignObj } from '../../utils';
import { getVm, repaint } from '../utils';
import { patchAttrs } from '../patchAttrs';
import { preProc } from '../preProc';
import { patch as fullPatch } from '../patch';
import { drainDidHooks } from '../hooks';

export function protoPatch(n, doRepaint) {
	patch(this, n, doRepaint);
}

// newNode can be either {class: style: } or full new VNode
// will/didPatch hooks?
export function patch(o, n, doRepaint) {
	// this is a weak assertion, will fail in cases of type attr mutation
	if (n.type != null) {
		// no full patching of view roots, just use redraw!
		if (o.vm != null)
			return;

		preProc(n, o.parent, o.idx, null);
		o.parent.body[o.idx] = n;
		fullPatch(n, o);
		doRepaint && repaint(n);
		drainDidHooks(getVm(n));
	}
	else {
		// TODO: re-establish refs

		// shallow-clone target
		var donor = Object.create(o);
		// fixate orig attrs
		donor.attrs = assignObj({}, o.attrs);
		// prepend any fixed shorthand class
		if (n.class != null && o._class != null)
			n.class = o._class + " " + n.class;
		// assign new attrs into live targ node
		var oattrs = assignObj(o.attrs, n);

		patchAttrs(o, donor);

		doRepaint && repaint(o);
	}
}