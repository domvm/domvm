!(function() {
//  global util to redraw disjoint?, multiple import?
	function util(ctx, propThen) {		// just "then"?			// syncThen
		var _redraw, _emit;

		function redrawRoot() {
			_emit("_redraw:1000");
		}

		function noop() {}

		propThen = propThen === false ? noop : propThen || redrawRoot;		// or emit
//	    syncThen = syncThen === false ? noop : syncThen || redrawRoot;		// or emit

		return {
			// rename to import?
			bind: function(redraw, emit) {
				_redraw = redraw;
				_emit = emit;
			},
			prop: function prop(initVal, then) {
				var val = initVal;

				then = then === false ? noop : then || propThen;

				var fn = function(newVal, fireChange) {
					if (arguments.length && newVal !== val) {
						var oldVal = val;
						val = newVal;
						if (fireChange !== false)
							then.call(fn, newVal, oldVal);
					}

					return val;
				};

				return fn;
			},
			sync: function(get, set) {		// optional then?
				var getFn = get,
					setFn = set;

				if (typeof get == "string") {
					getFn = function(e) {
						return e.target[get];
					};
				}

				if (typeof set == "string") {
					setFn = function(newVal) {			// optional fireChange?
						var oldVal = ctx[set];
						ctx[set] = val;
						(newVal !== oldVal) && propThen.call(null, newVal, oldVal);		// syncThen
					};
				}

				return function(e) {
					setFn(getFn(e));				// then !== false
				};
			},
		};
	};
	/*
	function thenRedrawRoot
	function thenRedrawParent
	function thenRedrawSelf
	function thenEmitChange
	u.thenEmit
	u.thenRedrawSelf
	u.thenRedrawRoot
	*/
	domvm.u = util;
})();