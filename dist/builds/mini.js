import micro from './micro';

import { streamCfg } from "../../src/view/addons/streamCfg";
import "../../src/view/addons/streamFlyd.js";

micro.streamCfg = streamCfg;

import { prop } from "../../src/utils";

micro.prop = prop;

export default micro;