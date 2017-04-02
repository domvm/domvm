import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { ViewModel } from './ViewModel';

export function createView(view, model, key, opts) {
	if (view.type === VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}
	else if (view.prototype._isClass)
		return new view(model, key, opts);

	return new ViewModel(view, model, key, opts);
}