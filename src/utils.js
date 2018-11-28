const ENV_DOM = typeof window !== "undefined";

export const doc = ENV_DOM ? document : {};

if (FEAT_RAF_REDRAW) {
	var rAF = (ENV_DOM ? window : {}).requestAnimationFrame;
}

export const emptyObj = {};

export function noop() {};

export function retArg0(a) { return a; }

export const isArr = Array.isArray;

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

export function sliceArgs(args, offs) {
	var arr = [];
	for (var i = offs; i < args.length; i++)
		arr.push(args[i]);
	return arr;
}

export function eqObj(a, b) {
	for (var i in a)
		if (a[i] !== b[i])
			return false;
	/* istanbul ignore next */
	return true;
}

export function eqArr(a, b) {
	const alen = a.length;

	/* istanbul ignore if */
	if (b.length !== alen)
		return false;

	for (var i = 0; i < alen; i++)
		if (a[i] !== b[i])
			return false;

	return true;
}

export function eq(o, n) {
	return o === n || (isArr(o) ? eqArr(o, n) : isPlainObj(o) ? eqObj(o, n) : false);
}

// https://github.com/darsain/raft
// rAF throttler, aggregates multiple repeated redraw calls within single animframe
/* istanbul ignore next */
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

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
// impl borrowed from https://github.com/ivijs/ivi
export function longestIncreasingSubsequence(a) {
	var p = a.slice(),
		result = [0],
		n = 0, u, v, j;

	for (var i = 0; i < a.length; ++i) {
		var k = a[i];

		if (k === -1)
			continue;

		j = result[n];

		if (a[j] < k) {
			p[i] = j;
			result[++n] = i;
			continue;
		}

		u = 0;
		v = n;

		while (u < v) {
			j = ((u + v) / 2) | 0;

			if (a[result[j]] < k)
				u = j + 1;
			else
				v = j;
		}

		if (k < a[result[u]]) {
			if (u > 0)
				p[i] = result[u - 1];

			result[u] = i;
		}
	}

	v = result[n];

	while (n >= 0) {
		result[n--] = v;
		v = p[v];
	}

	return result;
}

// based on https://github.com/Olical/binary-search
/* istanbul ignore next */
export function binaryFindLarger(item, list) {
	var min = 0;
	var max = list.length - 1;
	var guess;

	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}

	return (min == list.length) ? null : min;

//	return -1;
}