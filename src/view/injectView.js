import { VModel } from './VModel';


export function injectView(vm, data) {
	return new VModel(vm, data);
}