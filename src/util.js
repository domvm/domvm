!(function() {
//	global util to refresh disjoint?, multiple import?
	function util(ctx, propThen) {		// just "then"?			// syncThen
		var _refresh, _emit;

		function refreshRoot() {
			_emit("_r:1000");
		};

		function noop() {}

		propThen = propThen === false ? noop : propThen || refreshRoot;		// or emit
//		syncThen = syncThen === false ? noop : syncThen || refreshRoot;		// or emit

		return {
			bind: function(refresh, emit) {
				_refresh = refresh;
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
	function thenRefreshRoot
	function thenRefreshParent
	function thenRefreshSelf
	function thenEmitChange
	u.thenEmit
	u.thenRedrawSelf
	u.thenRedrawRoot
	*/
	domvm.u = util;
})();

/*
uniform ["p", "moo"] === ["p", ["moo"]]
isfunc body
maintain active element/selected, etc
checked, selectedIndex selected disabled bug with reuse
util for defered
fragments
_guard
refresh->redraw? update

moar tests
moar svg vs dom diffs, xlink


emit into

promiscuous, fetch
auto-px

auto-ref on all event handlers

focus is retained on reused elements when sibs are not re-rendered
(inputs, buttons)

auto-export refresh/redraw

shortcut for views
*/