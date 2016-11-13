// #destub: autoPx,isStream,hookStream

import { default as full } from './small';

import "../../src/view/addons/html";
import "../../src/view/addons/attach";

import { jsonml } from "../../src/view/addons/jsonml";

full.jsonml = jsonml;

export default full;