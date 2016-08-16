(function(domvm) {
	"use strict";

	var stack = [], pos = null,		// these should go into sessionStorage
		useHist = false,
		willEnter = null,
		willExit = null,
		didEnter = null,
		didExit = null,
		notFound = null,
		root = "";

	domvm.route = function(routeFn, imp) {
		var init = null;

		function routeFromLoc() {
			var l = location;
			var href = useHist ? l.href.substr(l.origin.length) : (l.hash.substr(1) || "/");
			return buildRoute(routes, root, href);
		}

		var api = {
			href: function(name, segs, query, hash, repl) {
				var route = buildRoute(routes, root, name, segs, query, hash);

				var fn = function(e) {
					api.goto(route, segs, query, hash, repl);
					e.preventDefault();
					// stop prop?
				};

				fn.href = (useHist ? "" : "#") + route.href;

				return fn;
			},
			config: function(opts) {
				useHist = opts.useHist;

				if (useHist)
					root = opts.root || "";

				willEnter = opts.willEnter || null;
				willExit = opts.willExit || null;
				didEnter = opts.didEnter || null;
				didExit = opts.didExit || null;
				notFound = opts.notFound || null;

				init = opts.init || null;
			},
			refresh: function() {
				api.goto(routeFromLoc(),null,null,null,true);
			},
			// dest can be route key, href or route object from buildRoute()
			goto: function(dest, segs, query, hash, repl, noFns) {
				if (!dest.href)
					dest = buildRoute(routes, root, dest, segs, query, hash);

				// is "_noMatch" a route? not really since there are multiple views, nomatch needs to accept original intended route
				if (dest.name === false) {
					if (notFound)
						notFound(dest);		// || .apply(null, arguments)?
					else
						console.log("Could not find route");		// loop back to _noMatch?
				}
				else {
					// BUG?: this will push dest onto stack before running can* checks, so

					var toPos = null;
					var dir = 0;
					for (var i = 0; i < stack.length; i++) {
						if (stack[i].href === dest.href) {		// set repl?
							toPos = i;
							break;
						}
					}

					// new fwd
					if (toPos === null) {
						stack.splice(pos+1, 1e4);	// trim array
						stack.push(dest);
						toPos = stack.length - 1;
					}

					var prev = stack[pos];
					var next = stack[toPos];

					var canExit = true;
					var canEnter = true;

					if (pos !== null) {
						if (willExit)
							canExit = noFns || willExit(prev, next);

						if (canExit !== false) {
							var onexit = routes[prev.name].onexit;
							canExit = !onexit ? true : noFns || onexit.apply(null, (prev ? [prev.segs, prev.query, prev.hash] : []).concat(next));

							if (didExit)
								didExit(prev, next);
						}
						else {
						//	revert nav?
						}
					}

					if (canExit !== false) {
						if (willEnter)
							canEnter = noFns || willEnter(next, prev);

						if (canEnter !== false) {
							var onenter = routes[next.name].onenter;
							canEnter = noFns || onenter.apply(null, (next ? [next.segs, next.query, next.hash] : []).concat(prev));

							if (didEnter)
								didEnter(next, prev);
						}

						if (canEnter !== false) {
							if (useHist) {
								gotoLocChg = true;
								history[repl ? "replaceState" : "pushState"](null, "title", next.href);
							}
							else {
								var hash = "#"+next.href;

								if (location.hash !== hash) {
									gotoLocChg = true;

									if (repl)
										location.replace(hash);
									else
										location.hash = hash;
								}
							}

							pos = toPos;
						}
						else {
						//	revert nav?
						}
					}
				}
			},
			// in contrast to goto(), this route getter/setter does not
			// invoke handlers and is designed to reflect an already changed
			// app/view state rather than requesting a state change
			route: function(dest, segs, query, hash, repl) {
				if (dest != null)
					api.goto(dest, segs, query, hash, repl, true);				// TODO: avoid setting current if same as dest
				else
					return pos == null ? routeFromLoc() : stack[pos];
			},
	//		next:
	//		prev:		// revert path
		};

		// BC compat
		api.location = api.route;

		var routes = routeFn(api, imp);

		buildRegexPaths(routes, root);

		// tmp flag that indicates that hash or location changed as result of a goto call rather than natively.
		// prevents cyclic goto->hashchange->goto...
		var gotoLocChg = false;

		window.onhashchange = window.onpopstate = function(e) {
			if (!useHist && e.type == "popstate")
				return;

			if (!useHist && gotoLocChg) {
				gotoLocChg = false;
				return;
			}

			api.goto(routeFromLoc(),null,null,null,true);
		};

		init && init();

		return api;
	};

	// builds uniform route args and matches routes
	// if href (including root) is provided for nameOrHref, root & remaining args are ignored
	function buildRoute(routes, root, nameOrHref, segs, query, hash) {
		var path = null,
			name = null,
			href = null;

		// parse path, find route
		if (nameOrHref[0] == "/") {
			href = nameOrHref;
			name = false;
			segs = {};

			var pathHash = href.split("#"),
				pathQuery = pathHash[0].split("?");

			path = pathQuery[0];
			hash = pathHash[1];

			if (pathQuery[1]) {
				query = {};

				pathQuery[1].split("&").map(function(pair) {
					var nameVal = pair.split("=");
					query[nameVal[0]] = nameVal[1] == null ? true : nameVal[1];
				});
			}

			// find name & segs by matching root + path
			var match;
			for (var i in routes) {
				var rtDef = routes[i],
					pathDef = rtDef.path;

		//		if (match = (root+path).match(rtDef.regexPath)) {
				if (match = (path).match(rtDef.regexPath)) {
					name = i;

					if (pathDef.indexOf(":") !== -1) {
						segs = {};
						match.shift();
						pathDef.replace(/:([^\/]+)/g, function(m, segName) {
							segs[segName] = match.shift();
						});
					}

					break;
				}
			}
		}
		// build path
		else {
			name = nameOrHref;

			var rtDef = routes[name],
				pathDef = root + rtDef.path,
				segDef = rtDef.vars || {};

			if (pathDef.indexOf(":") !== -1) {
				href = path = pathDef.replace(/:([^\/]+)/g, function(m, segName) {
					if ((segDef[segName] || /^[^\/]+$/).test(segs[segName]))
						return (segs[segName] += "");

					throw new Error("Invalid value for route '"+pathDef+"' segment '"+segName+"': '"+segs[segName]+"'");
				});
			}
			else
				href = path = pathDef;

			if (query) {
				href += "?";
				for (var q in query)
					href += q + (query[q] !== true ? "=" + query[q] : "") + "&";			// todo: trim "&", urlencode
				href = href.slice(0,-1);
			}

			href += hash ? ("#" + hash) : "";
		}

		return {
			href: href,
			name: name,
			path: path,
			segs: segs,
			hash: hash,
			query: query,
		};
	}

	// creates full regex paths by merging regex param validations
	function buildRegexPaths(routes, root) {
		for (var i in routes) {
			var r = routes[i];
			// todo: first replace r.path regexp special chrs via RegExp.escape?
			r.regexPath = new RegExp("^" + root +
				r.path.replace(/:([^\/]+)/g, function(m, name) {
					var segDef = r.vars || {};
					var regExStr = ""+(segDef[name] || /[^\/]+/);
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