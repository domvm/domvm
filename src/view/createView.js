import { VTYPE } from './VTYPE';
import { ViewModel } from './ViewModel';

// global id counter
let vmid = 0;

// global registry of all views
// this helps the gc by simplifying the graph
export const views = {};

export function createView(view, model, key, opts) {
	if (view.type == VTYPE.VVIEW) {
		model	= view.model;
		key		= view.key;
		opts	= view.opts;
		view	= view.view;
	}

	var vm = new ViewModel(vmid++, view, model, key, opts);
	views[vm.id] = vm;
	return vm;
}