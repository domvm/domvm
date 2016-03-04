(function(domvm) {
	"use strict";

	domvm.route = function(routeFn, imp) {
		var useHash = false,
			root = "";

		function getPath() {
			return useHash ? (location.hash.substr(1) || "/") : location.pathname;
		}

		var api = {
			href: function(name, params, repl) {
				var path = buildPath(routes, name, params);

			//	console.log(root, path);		// (useHash ? "#" : "") + root +

				if (useHash)
					return "#" + root + path;
				else {
					var fn = function(e) {
						api.goto(name, params, repl);
						e.preventDefault();
						// stop prop?
					};
					fn.path = root + path;
					return fn;
				}
			},
			config: function(opts) {
				useHash = opts.useHash;
				if (!useHash)
					root = opts.root || "";
			},
			refresh: function() {
				api.goto(getPath(), null, true);
			},
			// should this return promise?
			// pass in some state to save?
			goto: function(name, params, repl) {
			//	console.log("going to", name, params, repl);
				params = params || [];
				repl = repl || initial;

				var targ = getTargRoute(routes, root, name, params);
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

					var prev = stack[pos];
					var next = stack[toPos];

					var args = Array.prototype.slice.call(arguments);

					var canExit = true;

					if (pos !== null) {
						var onexit = stack[pos].route.onexit;
						canExit = !onexit ? true : onexit.apply(null, [{to: next}].concat(prev ? prev.params : []));
					}

					if (canExit !== false) {
						var canEnter = stack[toPos].route.onenter.apply(null, [{from: prev}].concat(params));

						if (canEnter === false) {
						//	revert nav?
						}
						else {
							if (useHash) {
								if (repl)
									location.replace("#"+path);
								else
									location.hash = "#"+path;

								setHashState([name, params], "title", path);
							}
							else
								history[repl ? "replaceState" : "pushState"]([name, params], "title", path);

							pos = toPos;
						}
					}

					initial = false;
				}
			},
			current: function() {
				return initial ? getTargRoute(routes, root, getPath()) : stack[pos];
			//	return stack[pos];
			},
	//		next:
	//		prev:		// revert path
		};

		var initial = true;

		var pos = null;
		var stack = [];
		var routes = routeFn(api, imp);

		buildRegexPaths(routes, root);

	//	console.log(routes);

		var hashState = {};				// todo: json-serialize to sessionStorage

		function getHashState(path) {
			return hashState[path];
		}

		function setHashState(state, title, path) {
			hashState[path] = state;
		}

		onhashchange = onpopstate = null;

		if (useHash) {
			onhashchange = function(e) {
				var path = getPath();
				var prevState = getHashState(path);
				api.goto.apply(null, (prevState || [path]).concat(true));
			};
		}
		else {
			onpopstate = function(e) {
				api.goto.apply(null, e.state.concat(true));
			};
		}

		return api;
	};

	function getTargRoute(routes, root, name, params) {
		if (name[0] === "/") {
			var path = name;		//  (useHash ? "" : root) +
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
			var path = root + buildPath(routes, name, params);

		return {name: name, route: routes[name], params: params, path: path};
	}

	function buildPath(routes, name, params) {
		var r = routes[name];
		var full = r.path;
		if (params && full.indexOf(":") !== -1) {
			params = params.slice();
			var ok = true,
				out = full.replace(/:([^\/]+)/g, function(m, name) {
					var p = params.shift();									// :(
					if (r.params && r.params[name]) {
						if ((""+p).match(r.params[name]))
							return p;
						else
							ok = false;
					}
					else
						return p;
				});

			if (!ok)
				return ok;

			full = out;
		}

		return full;
	}

	// creates full regex paths by merging regex param validations
	function buildRegexPaths(routes, root) {
		for (var i in routes) {
			var r = routes[i];
			// todo: first replace r.path regexp special chrs via RegExp.escape?
			r.regexPath = new RegExp("^" + root +
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