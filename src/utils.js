const ENV_DOM = typeof HTMLElement == "function";

export const emptyObj = {};

export function startsWith(haystack, needle) {
	return haystack.lastIndexOf(needle, 0) === 0;
}

export function isUndef(val) {
	return typeof val == "undefined";
}

export function isArr(val) {
	return Array.isArray(val);
}

export function isObj(val) {
	return val != null && typeof val == "object" && !isArr(val);
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

/*
export function cmpArr(a, b) {
	const alen = a.length;

	if (b.length != alen)
		return false;

	for (var i = 0; i < alen; i++)
		if (a[i] !== b[i])
			return false;

	return true;
}
*/