const ENV_DOM = typeof HTMLElement == "function";
const win = ENV_DOM ? window : {};
const rAF = win.requestAnimationFrame;

export const emptyObj = {};

export function startsWith(haystack, needle) {
	return haystack.lastIndexOf(needle, 0) === 0;
}

export function isUndef(val) {
	return typeof val == "undefined";
}

export const isArr = Array.isArray;

export function isObj(val) {
	return val != null && typeof val == "object" && val.constructor == Object;
}

export function insertArr(targ, arr, pos, rem) {
	targ.splice.apply(targ, [pos, rem].concat(arr));
}

export function isVal(val) {
	var t = typeof val;
	return t === "string" || t === "number";
}

export function isFunc(val) {
	return typeof val === "function";
}

export function isProm(val) {
	return typeof val === "object" && isFunc(val.then);
}

export function isElem(val) {
	return ENV_DOM && val instanceof HTMLElement;
}

export function assignObj(targ) {
	var args = arguments;

	for (var i = 1; i < args.length; i++)
		for (var k in args[i])
			targ[k] = args[i][k];

	return targ;
}

export function deepSet(targ, path, val) {
	var seg;

	while (seg = path.shift()) {
		if (path.length == 0)
			targ[seg] = val;
		else
			targ[seg] = targ = targ[seg] || {};
	}
}
/*
export function deepUnset(targ, path) {
	var seg;

	while (seg = path.shift()) {
		if (path.length == 0)
			targ[seg] = val;
		else
			targ[seg] = targ = targ[seg] || {};
	}
}
*/

export function sliceArgs(args, offs) {
	return Array.prototype.slice.call(args, offs || 0)
}

export function cmpArr(a, b) {
	const alen = a.length;

	if (b.length != alen)
		return false;

	for (var i = 0; i < alen; i++)
		if (a[i] !== b[i])
			return false;

	return true;
}

// https://github.com/darsain/raft
// rAF throttler, aggregates multiple repeated redraw calls within single animframe
export function raft(fn) {
	if (!rAF)
		return fn;

	var id, ctx, args;

	function call() {
		id = 0;
		fn.apply(ctx, args);
	}

	return function() {
		ctx = this;
		args = arguments;
		if (!id) id = rAF(call);
	};
}

export function curry(fn, args, ctx) {
	return function() {
		return fn.apply(ctx, args);
	};
}

export function prop(val, cb, ctx, args) {
	return function(newVal, execCb) {
		if (!isUndef(newVal) && newVal !== val) {
			val = newVal;
			execCb !== false && isFunc(cb) && cb.apply(ctx, args);
		}

		return val;
	};
}