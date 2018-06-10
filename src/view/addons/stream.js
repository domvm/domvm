import { noop, retArg0 } from "../../utils";

export let streamVal = retArg0;
export let streamOn = noop;
export let streamOff = noop;

export function streamCfg(cfg) {
	streamVal = cfg.val;
	streamOn = cfg.on;
	streamOff = cfg.off;
}