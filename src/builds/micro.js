import { ViewModelProto } from '../view/ViewModel';
import { default as micro } from "./nano";

import { emit } from "../view/addons/emit";
ViewModelProto.emit = emit;
ViewModelProto.onemit = null;

import { nextSubVms } from "../view/addons/vmBody";

ViewModelProto.body = function() {
	return nextSubVms(this.node, []);
};

import { defineElementSpread } from "../view/addons/defineElementSpread";
import { defineSvgElementSpread } from "../view/addons/defineSvgElementSpread";

micro.defineElementSpread = defineElementSpread;
micro.defineSvgElementSpread = defineSvgElementSpread;

export default micro;