// #destub: cssTag,autoPx,isStream,hookStream

import { default as mini } from './micro';

import { streamCfg } from "../../src/view/addons/streamCfg";
import "../../src/view/addons/streamFlyd.js";

mini.streamCfg = streamCfg;

import { prop } from "../../src/utils";

mini.prop = prop;

export default mini;