import micro from './micro';

import { streamCfg } from "../../src/streamCfg";
import "../../src/streamFlyd.js";

micro.streamCfg = streamCfg;

import { prop } from "../../src/utils";

micro.prop = prop;

export default micro;