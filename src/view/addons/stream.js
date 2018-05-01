import { noop } from "../../utils";

export let streamVal = noop;
export let streamOn = noop;
export let streamOff = noop;

export function streamCfg(cfg) {
	streamVal = cfg.val;
	streamOn = cfg.on;
	streamOff = cfg.off;
}