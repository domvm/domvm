import { VVIEW } from './VTYPES';

// placeholder for declared views
export function VView(view, model, key, opts) {
	this.view = view;
	this.model = model;
	this.key = key == null ? model : key;	// same logic as ViewModel
	this.opts = opts;
}

VView.prototype = {
	constructor: VView,

	type: VVIEW,
	view: null,
	model: null,
	key: null,
	opts: null,
};