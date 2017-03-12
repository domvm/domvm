// #destub: cssTag,autoPx

import { default as nano } from "./pico";

import "../view/addons/diff";
import "../view/addons/patch";

import { h } from "../view/addons/h";

nano.h = h;

import { defineElementSpread } from "../view/addons/defineElementSpread";

nano.defineElementSpread = defineElementSpread;

export default nano;