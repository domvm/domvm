import { isVal, sliceArgs, assignObj } from '../../utils';

var onemit = {};

export function emitCfg(cfg) {
	assignObj(onemit, cfg);
}

export function emit(evName) {
	var targ = this,
		src = targ;

	var args = sliceArgs(arguments, 1).concat(src, src.data);

	do {
		var evs = targ.onemit;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(targ, args);
			break;
		}
	} while (targ = targ.parent());

	if (onemit[evName])
		onemit[evName].apply(targ, args);
}