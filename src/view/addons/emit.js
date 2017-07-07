import { isVal, sliceArgs, assignObj } from '../../utils';

var onemit = {};

export function emitCfg(cfg) {
	assignObj(onemit, cfg);
}

export function emit(evName) {
	var targ = this,
		src = targ;

	var args = [src].concat(sliceArgs(arguments, 1));

	do {
		var evs = targ.onemit;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(null, args);
			break;
		}
	} while (targ = targ.parent());

	if (onemit[evName])
		onemit[evName].apply(null, args);
}