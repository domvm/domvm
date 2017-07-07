import { default as server } from "./mini";

import { ViewModelProto } from '../view/ViewModel';
import { VNodeProto } from '../view/VNode';
import { vmProtoHtml, vProtoHtml } from "../view/addons/html";

ViewModelProto.html = vmProtoHtml;
VNodeProto.html = vProtoHtml;

export default server;