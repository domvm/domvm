// #destub: cssTag,autoPx,isStream,hookStream

import { default as full } from "./mini";

import { createRouter } from "../router";
full.createRouter = createRouter;

import "../view/addons/attach";

import "../view/addons/html";

export default full;