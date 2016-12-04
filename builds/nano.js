// #destub: cssTag,autoPx

import { default as nano } from "./pico";

import "../src/view/addons/diff";
import "../src/view/addons/patch";

import { defineElementSpread } from "../src/view/addons/defineElementSpread";

nano.defineElementSpread = defineElementSpread;

export default nano;