export * from "./pico";

import { VNodeProto } from '../view/VNode';
import { protoPatch } from "../view/addons/patch";

VNodeProto.patch = protoPatch;

/*
import { h } from "../view/addons/h";

nano.h = h;

import { defineElementSpread } from "../view/addons/defineElementSpread";

nano.defineElementSpread = defineElementSpread;
*/