export * from "./pico";

import { VNodeProto } from '../view/VNode';
import { protoPatch } from "../view/addons/patch";

VNodeProto.patch = protoPatch;