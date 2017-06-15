import { defineElementSpread } from "./defineElementSpread";
import { SVG_NS } from "../defineSvgElement";

export function defineSvgElementSpread() {
	var n = defineElementSpread.apply(null, arguments);
	n.ns = SVG_NS;
	return n;
}