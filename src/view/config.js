import { noop } from '../utils';
import { streamCfg } from './addons/stream';

export let onevent = noop;

export function config(newCfg) {
	onevent = newCfg.onevent || onevent;

	if (FEAT_STREAM) {
		if (newCfg.stream)
			streamCfg(newCfg.stream);
	}
}