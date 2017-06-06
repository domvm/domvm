import { VView } from './VView';

export function defineView(view, data, key, opts) {
	return new VView(view, data, key, opts);
}