import { isVal, emptyObj } from '../utils';
import { getVm } from './utils';
import { isStream, hookStream } from './addons/stubs';
import { globalCfg } from './config';

// assumes if styles exist both are objects or both are strings
export function patchStyle(n, o) {
	var ns =     (n.attrs || emptyObj).style;
	var os = o ? (o.attrs || emptyObj).style : null;

	// replace or remove in full
	if (ns == null || isVal(ns))
		n.el.style.cssText = ns;
	else {
		for (var nn in ns) {
			var nv = ns[nn];

			if (isStream(nv))
				nv = hookStream(nv, getVm(n));

			if (os == null || nv != null && nv !== os[nn])
				n.el.style[nn] = globalCfg.autoPx(nn, nv);
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					n.el.style[on] = "";
			}
		}
	}
}