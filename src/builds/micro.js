export * from "./nano";
export { defineElementSpread } from "../view/addons/defineElementSpread";
export { defineSvgElementSpread } from "../view/addons/defineSvgElementSpread";

import { ViewModelProto } from '../view/ViewModel';
import { emit } from "../view/addons/emit";
import { nextSubVms } from "../view/addons/vmBody";

ViewModelProto.emit = emit;
ViewModelProto.onemit = null;
ViewModelProto.body = function() {
	return nextSubVms(this.node, []);
};