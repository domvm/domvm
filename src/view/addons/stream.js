import { noop } from "../../utils";

export let isStream = function() { return false };

export let streamVal = noop;
export let subStream = noop;
export let unsubStream = noop;

export function streamCfg(cfg) {
	isStream	= cfg.is;
	streamVal	= cfg.val;
	subStream	= cfg.sub;
	unsubStream	= cfg.unsub;
}

// creates a one-shot self-ending stream that redraws target vm
// TODO: if it's already registered by any parent vm, then ignore to avoid simultaneous parent & child refresh
export function hookStream(s, vm) {
	var redrawStream = subStream(s, val => {
		// this "if" ignores the initial firing during subscription (there's no redrawable vm yet)
		if (redrawStream) {
			// if vm fully is formed (or mounted vm.node.el?)
			if (vm.node != null)
				vm.redraw();
			unsubStream(redrawStream);
		}
	});

	return streamVal(s);
}

export function hookStream2(s, vm) {
	var redrawStream = subStream(s, val => {
		// this "if" ignores the initial firing during subscription (there's no redrawable vm yet)
		if (redrawStream) {
			// if vm fully is formed (or mounted vm.node.el?)
			if (vm.node != null)
				vm.redraw();
		}
	});

	return redrawStream;
}