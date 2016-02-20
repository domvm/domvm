(function(domvm) {
	"use strict";

	domvm.route = function(routeFn, imp) {
		var api = {
			href: function(name, params, repl) {
				var fn = function(e) {
					api.goto(name, params, repl);
					e.preventDefault();
					// stop prop?
				};

				fn.path = buildPath(routes, name, params);
				return fn;
			},
			refresh: function() {
				api.goto(window.location.pathname);
			},
			// should this return promise?
			// pass in some state to save?
			goto: function(name, params, repl) {
			//	console.log("going to", name, params, repl);
				params = params || [];
				repl = repl || initial;

				var targ = getTargRoute(routes, name, params);
				var path = targ.path;
				name = targ.name;
				params = targ.params;

				if (path === false)
					console.log("Could not find route");
				else {
					var toPos = null;
					var dir = 0;
					for (var i = 0; i < stack.length; i++) {
						if (stack[i].path === path) {
							toPos = i;
							break;
						}
					}

					// new fwd
					if (toPos === null) {
						stack.splice(pos+1, 1e4);	// trim array
						stack.push({name: name, route: routes[name], params: params, path: path});
						toPos = stack.length - 1;
					}

					var next = stack[toPos];

					var args = Array.prototype.slice.call(arguments);

					var canExit = true;

					if (pos !== null) {
						var onexit = stack[pos].route.onexit;
						canExit = !onexit ? true : onexit.call(null, stack[toPos].params.concat(next));
					}

					if (canExit !== false) {
						var canEnter = stack[toPos].route.onenter.apply(null, params.concat(stack[pos]));

						if (canEnter === false) {
						//	revert nav?
						}
						else {
							history[repl ? "replaceState" : "pushState"]([name, params], "title", path);
							pos = toPos;
						}
					}

					initial = false;
				}
			},
			current: function() {
				return initial ? getTargRoute(routes, window.location.pathname) : stack[pos];
			//	return stack[pos];
			},
	//		next:
	//		prev:		// revert path
		};

		var initial = true;

		var pos = null;
		var stack = [];
		var routes = routeFn(api, imp);

		buildRegexPaths(routes);

	//	console.log(routes);

		window.onpopstate = function(e) {
			api.goto.apply(null, e.state.concat(true));
		};

		return api;
	};

	function getTargRoute(routes, name, params) {
		if (name[0] === "/") {
			var path = name;
			var name = null;

			var match;
			for (var i in routes) {
				if (match = path.match(routes[i].regexPath)) {
					params = match.slice(1);
					name = i;
			//		console.log(name, params);
					break;
				}
			}

			if (name === null)
				name = "_noMatch";
		}
		else
			var path = buildPath(routes, name, params);

		return {name: name, route: routes[name], params: params, path: path};
	}

	function buildPath(routes, name, params) {
		var r = routes[name];
		var full = r.path;
		if (params && full.indexOf(":") !== -1) {
			params = params.slice();
			var ok = true,
				out = full.replace(/:([^\/]+)/g, function(m, name) {
					var p = params.shift();									// should be named? :(
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

	// creates full regex paths by merging regex param validations
	function buildRegexPaths(routes) {
		for (var i in routes) {
			var r = routes[i];
			// todo: first replace r.path regexp special chrs via RegExp.escape?
			r.regexPath = new RegExp("^" +
				r.path.replace(/:([^\/]+)/g, function(m, name) {
					var regExStr = ""+r.params[name];
					return "(" + regExStr.substring(1, regExStr.lastIndexOf("/")) + ")";
				})
			+ "$");
		}
	}

/*
	RegExp.escape = function(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	};
*/
})(domvm);