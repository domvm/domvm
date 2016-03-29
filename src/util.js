(function(domvm) {
	"use strict";

	var win = typeof window == "undefined" ? {} : window;

	var t = true;
	var unitlessProps = {
		animationIterationCount: t,
		boxFlex: t,
		boxFlexGroup: t,
		columnCount: t,
		counterIncrement: t,
		fillOpacity: t,
		flex: t,
		flexGrow: t,
		flexOrder: t,
		flexPositive: t,
		flexShrink: t,
		float: t,
		fontWeight: t,
		gridColumn: t,
		lineHeight: t,
		lineClamp: t,
		opacity: t,
		order: t,
		orphans: t,
		stopOpacity: t,
		strokeDashoffset: t,
		strokeOpacity: t,
		strokeWidth: t,
		tabSize: t,
		transform: t,
		transformOrigin: t,
		widows: t,
		zIndex: t,
		zoom: t,
	};

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
		isProm: function(val) {
			return typeof val === "object" && u.isFunc(val.then);
		},
		// saves from having to do fn && fn()
		execAll: function(fnArr, args) {
			fnArr && (!u.isArr(fnArr) ? [fnArr] : fnArr).forEach(function(fn) {
				return fn.apply(null, args);
			});
		},
		insertArr: function(targ, arr, pos, rem) {
			targ.splice.apply(targ, [pos, rem].concat(arr));
		},
		isEvProp: function(prop) {
			return prop.substr(0,2) === "on";
		},
		isDynProp: function(tag, attr) {
			switch (tag) {
				case "input":
				case "textarea":
				case "select":
				case "option":
					switch (attr) {
						case "value":
						case "checked":
						case "selected":
						case "selectedIndex":
							return true;
					}
			}
		},
		camelDash: function(val) {
			return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		},
		autoPx: function(name, val) {
			return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
		},
		deepSet: function(targ, path, val) {
			var segs = path.split(".");
			var last = segs.pop();

			segs.forEach(function(s) {
				if (!targ[s])
					targ[s] = {};
				targ = targ[s];
			});

			targ[last] = val;
		},
		keyedIdx: function(key, nodes, viewFn, start, end) {
			for (var i = 0; i < nodes.length; i++) {
				var n = nodes[i];
				if (n.key === key) {
					if (viewFn) {
						if (n.vm && n.vm.view[0] === viewFn)
							return i;
					}
					else
						return i;
				}
			}
			return -1;
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