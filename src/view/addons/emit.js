import { ViewModelProto } from '../ViewModel';
import { isVal, sliceArgs } from '../../utils';

ViewModelProto.events = null;
ViewModelProto.emit = emit;

function emit(evName) {
	var targ = this,
		src = targ;

	do {
		var evs = targ.events;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(null, [src].concat(sliceArgs(arguments, 1)));
			break;
		}

	} while (targ = targ.parent());
}