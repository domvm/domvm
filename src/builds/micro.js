import { default as micro } from "./nano";

import "../view/addons/emit";
import "../view/addons/vmBody";

import { defineElementSpread } from "../view/addons/defineElementSpread";
import { defineSvgElementSpread } from "../view/addons/defineSvgElementSpread";

micro.defineElementSpread = defineElementSpread;
micro.defineSvgElementSpread = defineSvgElementSpread;

export default micro;