// #destub: cssTag,autoPx,isStream,hookStream

import { default as client } from "./mini";

import { createRouter } from "../router";
client.createRouter = createRouter;

import "../view/addons/attach";

export default client;