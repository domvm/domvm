import { autoPx } from './utils';
import { isVal } from '../utils';

// assumes if styles exist both are objects or both are strings
export function patchStyle(n, o) {
	var ns = n.attrs.style;
	var os = o ? o.attrs.style : null;		// || emptyObj?

	// replace or remove in full
	if (ns == null || isVal(ns))
		n.el.style.cssText = ns;
	else {
		for (var nn in ns) {
			var nv = ns[nn];
			if (os == null || nv != null && nv !== os[nn])
				n.el.style[nn] = autoPx(nn, nv);
		}

		// clean old
		if (os) {
			for (var on in os) {
				if (ns[on] == null)
					n.el.style[on] = null;
			}
		}
	}
}