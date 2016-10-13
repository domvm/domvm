import { VModel } from './VModel';


export function injectView(vm) {
//	if (vm._node == null)
//		vm._redraw(null, null, false);

//	return vm._node;

	return new VModel(vm);
}