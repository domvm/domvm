import { defineElement } from "./defineElement";

//export const XML_NS = "http://www.w3.org/2000/xmlns/";
export const SVG_NS = "http://www.w3.org/2000/svg";

export function defineSvgElement(tag, arg1, arg2, flags) {
	var n = defineElement(tag, arg1, arg2, flags);
	n.ns = SVG_NS;
	return n;
}