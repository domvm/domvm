import { VView } from './VView';

export function defineView(view, model, key, opts) {
	return new VView(view, model, key, opts);
}