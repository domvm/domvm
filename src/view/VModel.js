import { VTYPE } from './VTYPE';

// placeholder for injected ViewModels
export function VModel(vm) {
	this.vmid = vm.id;
}

VModel.prototype = {
	constructor: VModel,

	type: VTYPE.VMODEL,
	vmid: null,
};