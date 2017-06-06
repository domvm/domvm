import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { ViewModel } from './ViewModel';

export function createView(view, data, key, opts) {
	if (view.type === VVIEW) {
		data	= view.data;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}
	else if (view.prototype._isClass)
		return new view(data, key, opts);

	return new ViewModel(view, data, key, opts);
}