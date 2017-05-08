export const ENV_DOM = typeof window !== "undefined";
export const TRUE = true;
const win = ENV_DOM ? window : {};
const rAF = win.requestAnimationFrame;

// http://tanalin.com/en/articles/ie-version-js/
// =============================================
// IE versions	Condition to check for
// ------------------------------------
// 10 or older	document.all
// 9 or older	document.all && !window.atob
// 8 or older	document.all && !document.addEventListener
// 7 or older	document.all && !document.querySelector
// 6 or older	document.all && !window.XMLHttpRequest
// 5.x	document.all && !document.compatMode
export const isIE8 = document.all && !document.addEventListener;

export const emptyObj = {};

export function noop() {};

export const isArr = Array.isArray;

export function isSet(val) {
	return val != null;
}

export function isPlainObj(val) {
	return val != null && val.constructor === Object;		//  && typeof val === "object"
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

// export const defProp = Object.defineProperty;

export function deepSet(targ, path, val) {
	var seg;

	while (seg = path.shift()) {
		if (path.length === 0)
			targ[seg] = val;
		else
			targ[seg] = targ = targ[seg] || {};
	}
}

/*
export function deepUnset(targ, path) {
	var seg;

	while (seg = path.shift()) {
		if (path.length === 0)
			targ[seg] = val;
		else
			targ[seg] = targ = targ[seg] || {};
	}
}
*/

export function sliceArgs(args, offs) {
	var arr = [];
	for (var i = offs; i < args.length; i++)
		arr.push(args[i]);
	return arr;
}

export function cmpObj(a, b) {
	for (var i in a)
		if (a[i] !== b[i])
			return false;

	return true;
}

export function cmpArr(a, b) {
	const alen = a.length;

	if (b.length !== alen)
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
		if (newVal !== undefined && newVal !== val) {
			val = newVal;
			execCb !== false && isFunc(cb) && cb.apply(ctx, args);
		}

		return val;
	};
}

// adapted from https://github.com/Olical/binary-search
export function binaryKeySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;

	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess].key === item) { return guess; }
			else {
				if (list[guess].key < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess].key === item) { return guess; }
			else {
				if (list[guess].key < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}

    return -1;
}