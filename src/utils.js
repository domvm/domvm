(function(domvm) {
	"use strict";

	var win = typeof window == "undefined" ? {} : window;

	var rAF = win.requestAnimationFrame;

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
		isElem: function(val) {
			return val instanceof HTMLElement;
		},
		// saves from having to do fn && fn()
		execAll: function(fnArr, arg1, arg2, arg3, arg4, arg5) {
			var out;
			fnArr && (u.isArr(fnArr) ? fnArr : [fnArr]).forEach(function(fn) {
				out = fn.call(null, arg1, arg2, arg3, arg4, arg5);
			});
			return out;
		},
		repaint: function(node) {
			var h = node.el.offsetHeight;
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
		cmpArr: function(a, b) {
			var i = a.length;

			if (i != b.length)
				return false;
			while (i--) {
				if (a[i] !== b[i])
					return false;
			}
			return true;
		},
		// todo: handle fn invocaion if encountered
		deepSet: function(targ, path, val, arg2, arg3, arg4) {
			var segs = path.split(".");
			var last = segs.pop();

			segs.forEach(function(s) {
				if (!targ[s])
					targ[s] = {};
				targ = targ[s];
			});

			if (u.isFunc(targ[last]))		// fn invocation at end only (deep w.prop())
				targ[last](val, arg2, arg3, arg4);
			else
				targ[last] = val;
		},
		// todo: handle fn invocaion if encountered
		deepGet: function(targ, path) {
			var segs = path.split(".");

			do {
				targ = targ[segs.shift()];
			} while (segs.length);

			return targ;
		},
		keyedIdx: function(key, nodes, viewFn, start, end) {
			for (var i = 0; i < nodes.length; i++) {
				var n = nodes[i];
				if (n.key === key) {
					if (viewFn) {
						if (n.vm && n.vm.ident[0] === viewFn)
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
	};

	domvm.utils = u;
})(domvm);