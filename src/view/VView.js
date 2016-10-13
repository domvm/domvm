import { VTYPE } from './VTYPE';

// placeholder for declared views
export function VView(view, model, key, opts) {
	this._view = view;
	this._model = model;
	this._key = key == null ? model : key;	// same logic as ViewModel
	this._opts = opts;
}

VView.prototype = {
	constructor: VView,

	_type: VTYPE.VVIEW,
	_view: null,
	_model: null,
	_key: null,
	_opts: null,
};