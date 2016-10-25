import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { ViewModel } from './ViewModel';

export function createView(view, model, key, opts) {
	if (view.type == VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	return new ViewModel(view, model, key, opts);
}