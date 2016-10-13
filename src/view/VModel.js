import { VTYPE } from './VTYPE';

// placeholder for injected ViewModels
export function VModel(vm) {
	this._vmid = vm._id;
}

VModel.prototype = {
	constructor: VModel,

	_type: VTYPE.VMODEL,
	_vmid: null,
};