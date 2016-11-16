import { ViewModelProto } from '../ViewModel';
import { isVal, sliceArgs } from '../../utils';

ViewModelProto.events = null;
ViewModelProto.emit = emit;
ViewModelProto.on = on;

function emit(evName) {
	var targ = this;

	do {
		var evs = targ.events;
		var fn = evs ? evs[evName] : null;

		if (fn) {
			fn.apply(null, sliceArgs(arguments, 1));
			break;
		}

	} while (targ = targ.parent());
}

function on(evName, fn) {
	var t = this;

	if (t.events == null)
		t.events = {};

	if (isVal(evName))
		t.events[evName] = fn;
	else {
		var evs = evName;
		for (var evName in evs)
			t.on(evName, evs[evName]);
	}
}

function off() {}