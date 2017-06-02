import { isArr } from '../utils';
import { repaint } from './utils';

export const didQueue = [];

export function fireHook(name, o, n, immediate) {
	var fn = o.hooks[name];

	if (fn) {
		if (name[0] === "d" && name[1] === "i" && name[2] === "d") {	// did*
			//	console.log(name + " should queue till repaint", o, n);
			immediate ? repaint(o.parent) && fn(o, n) : didQueue.push([fn, o, n]);
		}
		else {		// will*
			//	console.log(name + " may delay by promise", o, n);
			return fn(o, n);		// or pass  done() resolver
		}
	}
}

export function drainDidHooks(vm) {
	if (didQueue.length) {
		repaint(vm.node);

		var item;
		while (item = didQueue.shift())
			item[0](item[1], item[2]);
	}
}