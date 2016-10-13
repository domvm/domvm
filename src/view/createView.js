import { VTYPE } from './VTYPE';
import { ViewModel } from './ViewModel';

// global id counter
let vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
export const views = {};

export function createView(view, model, key, opts) {
	if (view._type == VTYPE.VVIEW) {
		model	= view._model;
		key		= view._key;
		opts	= view._opts;
		view	= view._view;
	}

	var vm = new ViewModel(vmid++, view, model, key, opts);
	views[vm._id] = vm;
	return vm;
}