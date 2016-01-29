(function(global) {
	"use strict";

	var win = typeof window == "undefined" ? {} : window;

	var u = {
		TYPE_ELEM: 1,
		TYPE_TEXT: 2,
	//	TYPE_RAWEL: 3,
	//	TYPE_FRAG: 4,

		isArr: function(val) {
			return val instanceof Array;
		},
		isVal: function(val) {
			var t = typeof val;
			return t === "string" || t === "number";
		},
		isObj: function(val) {
			return typeof val === "object" && val !== null && !u.isArr(val);
		},
		isFunc: function(val) {
			return typeof val === "function";
		},
//		isProm: function(val) {
//			typeof val === "object" && u.isFunc(val.then);
//		},
		// saves from having to do fn && fn()
		execAll: function(fnArr, args) {
			fnArr.forEach(function(fn) {
				return fn.apply(null, args);
			});
		},
		insertArr: function(targ, arr, pos, rem) {
			targ.splice.apply(targ, [pos, rem].concat(arr));
		},
		isEvProp: function(prop) {
			return prop.substr(0,2) === "on";
		},
		camelDash: function(val) {
			return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		},
		// https://github.com/darsain/raft
		// rAF throttler, aggregates multiple repeated redraw calls within single animframe
		raft: function(fn) {
			if (!win.requestAnimationFrame)
				return fn;

			var id, ctx, args;

			function call() {
				id = 0;
				fn.apply(ctx, args);
			}

			return function() {
				ctx = this;
				args = arguments;
				if (!id) id = win.requestAnimationFrame(call);
			};
		}
	};

	domvm.util = u;
})(domvm);