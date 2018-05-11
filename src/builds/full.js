export * from "./mini";

import { ViewModelProto } from '../view/ViewModel';
import { protoAttach } from "../view/addons/attach";
import { VNodeProto } from '../view/VNode';
import { vmProtoHtml, vProtoHtml } from "../view/addons/html";

ViewModelProto.attach = protoAttach;
ViewModelProto.html = vmProtoHtml;
VNodeProto.html = vProtoHtml;