import { VTYPE } from './VTYPE';
import { ViewModel } from './ViewModel';

export function createView(view, model, key, opts) {
	if (view.type == VTYPE.VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	return new ViewModel(view, model, key, opts);
}