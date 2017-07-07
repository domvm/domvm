import { default as client } from "./mini";

import { ViewModelProto } from '../view/ViewModel';
import { protoAttach } from "../view/addons/attach";
ViewModelProto.attach = protoAttach;

export default client;