import { noop } from '../utils';
import { streamCfg } from './addons/stream';
import { emitCfg } from './addons/emit';

export let onevent = noop;
export let syncRedraw = false;
export let didRedraws = noop;

export function config(newCfg) {
	if (FEAT_ONEVENT) {
		onevent = newCfg.onevent || onevent;
	}

	if (newCfg.syncRedraw != null)
		syncRedraw = newCfg.syncRedraw;

	if (newCfg.didRedraws != null)
		didRedraws = newCfg.didRedraws;

	if (FEAT_EMIT) {
		if (newCfg.onemit)
			emitCfg(newCfg.onemit);
	}

	if (FEAT_STREAM) {
		if (newCfg.stream)
			streamCfg(newCfg.stream);
	}
}