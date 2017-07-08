import { default as full } from "./mini";

import { ViewModelProto } from '../view/ViewModel';
import { protoAttach } from "../view/addons/attach";
ViewModelProto.attach = protoAttach;

import { VNodeProto } from '../view/VNode';
import { vmProtoHtml, vProtoHtml } from "../view/addons/html";

ViewModelProto.html = vmProtoHtml;
VNodeProto.html = vProtoHtml;

export default full;