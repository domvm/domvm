import { VMODEL } from './VTYPES';

// placeholder for injected ViewModels
export function VModel(vm) {
	this.vmid = vm.id;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vmid: null,
};