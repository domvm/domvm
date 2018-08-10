import { VMODEL } from './VTYPES';

// placeholder for injected ViewModels
export function VModel(vm, data) {
	this.vm = vm;
	this.data = data;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vm: null,
	data: null,
};