(function(domvm) {
	"use strict";

	domvm.route = function(routeFn, imp) {
		var initial = true;

		var api = {
			href: function() {
				var args = arguments;
				var fn = function(e) {
					api.goto.apply(null, args);
					e.preventDefault();
					// stop prop?
				};
				fn.url = buildUrl.apply(null, args);
				return fn;
			},
			// should this return promise?
			// pass in some state to save?
			goto: function(name, params, repl) {
				params = params || [];
				repl = repl || initial;

				var url = buildUrl(name, params);

				if (url === false)
					console.log("Could not find route");
				else {
					var toPos = null;
					var dir = 0;
					for (var i = 0; i < stack.length; i++) {
						if (stack[i].url === url) {
							toPos = i;
							break;
						}
					}

					// new fwd
					if (toPos === null) {
						stack.splice(pos+1, 1e4);	// trim array
						stack.push({name: name, route: routes[name], params: params, url: url});
						toPos = stack.length - 1;
					}

					var next = stack[toPos];

					var args = Array.prototype.slice.call(arguments);

					var canExit = true;

					if (pos !== null)
						canExit = stack[pos].route.onexit.call(null, stack[toPos].params.concat(next));

					if (canExit !== false) {
						var canEnter = stack[toPos].route.onenter.apply(null, params.concat(stack[pos]));

						if (canEnter === false) {
						//	revert nav?
						}
						else {
							history[repl ? "replaceState" : "pushState"]([name, params], "title", url);
							pos = toPos;
						}
					}

					initial = false;
				}
			},
			current: function() {
				return stack[pos];
			},
	//		next:
	//		prev:		// revert url
		};

		var pos = null;
		var stack = [];
		var cfg = routeFn(api, imp);
		var routes = cfg.routes;
		var root = cfg.root || "/";
	/*
		// can be optimized by prerpocessing routes on init only
		function match(fullUrl) {
			for (var name in routes) {
				var r = routes[name];
				var fullRoute = root + r.url;
				if (fullRoute === fullUrl)
					return r;

				var parts = r.url.split("/");
			}
		}
	*/
		function buildUrl(name, params) {
			var r = routes[name];
			var full = root + r.url;
			if (params && full.indexOf(":") !== -1) {
				params = params.slice();
				var ok = true,
					out = full.replace(/:([^\/]+)/g, function(m, name) {
						var p = params.shift();
						if (r.params && r.params[name]) {
							if ((""+p).match(r.params[name]))
								return p;
							else
								ok = false;
						}
						else
							return p;
					});

				return ok ? out : ok;
			}

			return full;
		}

		window.onpopstate = function(e) {
			api.goto.apply(null, e.state.concat(true));
		};

		return api;
	};
})(domvm);