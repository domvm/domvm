import { noop } from '../utils';
import { streamCfg } from './addons/stream';
import { emitCfg } from './addons/emit';

export let onevent = noop;

export function config(newCfg) {
	onevent = newCfg.onevent || onevent;

	if (FEAT_EMIT) {
		if (newCfg.onemit)
			emitCfg(newCfg.onemit);
	}

	if (FEAT_STREAM) {
		if (newCfg.stream)
			streamCfg(newCfg.stream);
	}
}