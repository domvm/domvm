(function(domvm) {
	"use strict";

	var stack = [], pos = null,		// these should go into sessionStorage
		useHist = false,
		willEnter = null,
		willExit = null,
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

				if (!useHist)
					return "#" + route.href;		// if repl here then use handler with location.replace?
				else {
					var fn = function(e) {
						api.goto(route,null,null,null,repl);
						e.preventDefault();
						// stop prop?
					};
					fn.href = route.href;
					return fn;
				}
			},
			config: function(opts) {
				useHist = opts.useHist;

				if (useHist)
					root = opts.root || "";

				willEnter = opts.willEnter || null;
				willExit = opts.willExit || null;

				init = opts.init || null;
			},
			refresh: function() {
				api.goto(routeFromLoc(),null,null,null,true);
			},
			// dest can be route key, href or route object from buildRoute()
			goto: function(dest, segs, query, hash, repl) {
				if (!dest.href)
					dest = buildRoute(routes, root, dest, segs, query, hash);

				// is "_noMatch" a route? not really since there are multiple views, nomatch needs to accept original intended route
				if (dest.name === false)
					console.log("Could not find route");		// loop back to _noMatch?
				else {
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

					if (pos !== null) {
						willExit && willExit(prev, next);
						var onexit = routes[prev.name].onexit;
						canExit = !onexit ? true : onexit.apply(null, (prev ? [prev.segs, prev.query, prev.hash] : []).concat(next));
					}

					if (canExit !== false) {
						willEnter && willEnter(next, prev);
						var onenter = routes[next.name].onenter;
						var canEnter = onenter.apply(null, (next ? [next.segs, next.query, next.hash] : []).concat(prev));

						if (canEnter === false) {
						//	revert nav?
						}
						else {
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
					}
				}
			},
			location: function() {
				return pos == null ? routeFromLoc() : stack[pos];
			//	return stack[pos];
			},
	//		next:
	//		prev:		// revert path
		};

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