import { VMODEL } from './VTYPES';

// placeholder for injected ViewModels
export function VModel(vm) {
	this.vm = vm;
}

VModel.prototype = {
	constructor: VModel,

	type: VMODEL,
	vm: null,
};