(function(domvm) {
	"use strict";

	var u = domvm.util;

	domvm.watch = function(handler) {
		var handlers = [];

		if (u.isFunc(handler))
			handlers.push(handler);

		function noop() {};

		function initFetch(method, url, body, cb, opts) {
			opts = opts || {};

			opts.method = (opts.method || method).toUpperCase();

			if (body !== null) {
				var type = Object.prototype.toString.call(body);
				if (type === "[object Array]" || type === "[object Object]") {
					opts.headers = opts.headers || new Headers();
					opts.headers.set("Content-Type", "application/json");
					opts.body = JSON.stringify(body);
				}
				else
					opts.body = ""+body;
			}

			var ok = cb,
				err = noop;

			if (cb instanceof Array) {
				ok = cb[0];
				if (cb[1])
					err = cb[1];
			}

			function checkStatus(resp) {
				if (resp.status >= 200 && resp.status < 300)
					return resp
				else {
					var err = new Error(resp.statusText)
					err.resp = resp
					throw err;
				}
			}

			var reader = function(resp) {
				var typeCharset = resp.headers.get("Content-Type");
				var type = typeCharset.split("; ")[0];
				switch(type) {
					case "application/json":	return resp.json();
					case "text/plain":			return resp.text();
				//								return resp.arrayBuffer()
				//								return resp.blob()
				//								return resp.formData()
					default:					return resp;
				}
			};

			var prom = fetch(url, opts)
				.then(checkStatus)
				// decode data
				.then(reader)
				// invoke provided callbacks, massage/set data
				.then(ok, err)
				// fire any redraws
				.then(function(res) {
					res !== false && api.fire();
					return res;
				}, noop);

			prom._fetchArgs = [method, url, body, [ok, err], opts];

			return prom;
		}

		var api = {
			on: function(handler) {
				handlers.push(handler);
				return api;
			},
			off: function(handler) {
				handlers.splice(handlers.indexOf(handler), 1);
				return api;
			},
			fire: function() {
				u.execAll(handlers, arguments);
				return api;
			},
			prop: function prop(initVal, asyncVal) {		// , model, name (if you want the handler to know ctx)
				var val = initVal;

				var fn = function(newVal, runHandlers) {
					if (arguments.length && newVal !== val) {
						var oldVal = val;
						val = newVal;
						if (runHandlers !== false)
							api.fire();
					}

					return val;
				};

				// TODO: also provide caching policy so redraws can re-fetch implicitly
				if (asyncVal && asyncVal.then) {
					fn.update = noop;

					// pending fetch provided?
					if (asyncVal._fetchArgs) {
						// splice the prop setter call into the original callbacks
						var origCbs = asyncVal._fetchArgs[3];
						asyncVal._fetchArgs[3] = [
							function(res) {
								return fn(origCbs[0] ? origCbs[0](res) : res);
							},
							origCbs[1],
						];

						fn.update = function() {
							initFetch.apply(null, asyncVal._fetchArgs);
						};
					}

					// this is needed to update the prop on following the already pending async call. without rAF debunce
					// will cause an extra redraw since we can't splice the setter into the already built chain
					asyncVal.then(fn);
				}

				// .ref()

				fn.toString = fn;

				return fn;
			},

			sync: function(get, set, altHandler) {
				var getFn = get,
					setFn = set;

				if (typeof get == "string") {		// todo: deep props .style.outerWidth, or e.which		e.clientX		e.target.value
					getFn = function(e) {
						if (get.substr(0,2) === "e.")
							return e[get.substr(2)];
						return e.target[get];
					};
				}

				return function(e) {
					var model = this !== window ? this : null

					if (model && typeof set == "string") {		// could be array ["propName", this]
						setFn = function(newVal, altHandler) {
							var oldVal = model[set];
							model[set] = newVal;
							if (handler && newVal !== oldVal && altHandler !== false)
								handler();
						};
					}

					setFn(getFn(e), altHandler);
				};
			},
	/*
			on: function() {

			},

			// then, onStart, onEnd, onProgress

			fetch: function(url, cb, opts) {
				return fetch(url, opts).then(ok, err).then(handler, noop);
			},
	*/
			get:	function(url, cb, opts) {
				return initFetch("get", url, null, cb, opts);
			},

			delete:	function(url, cb, opts) {
				return initFetch("delete", url, null, cb, opts);
			},

			post:	function(url, body, cb, opts) {
				return initFetch("post", url, body, cb, opts);
			},

			put:	function(url, body, cb, opts) {
				return initFetch("put", url, body, cb, opts);
			},

			patch:	function(url, body, cb, opts) {
				return initFetch("patch", url, body, cb, opts);
			},
		};

		return api;
	};
})(domvm);