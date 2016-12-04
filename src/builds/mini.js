// #destub: cssTag,autoPx,isStream,hookStream

import { default as mini } from "./micro";

import { streamCfg } from "../view/addons/streamCfg";
import "../view/addons/streamFlyd.js";

mini.streamCfg = streamCfg;

import { prop } from "../utils";

mini.prop = prop;

export default mini;