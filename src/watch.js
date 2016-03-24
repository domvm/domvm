(function(domvm) {
	"use strict";

	var u = domvm.util;

	domvm.watch = function(handler) {
		var handlers = [];

		if (u.isFunc(handler))
			handlers.push(handler);

		function noop() {};

		function initFetch(meth, url, body, cb, opts) {
			opts = opts || {};

			opts.method = meth.toUpperCase();

			if (body !== null) {
				if (u.isArr(body) || u.isObj(body)) {
					opts.headers = opts.headers || new Headers();
					opts.headers.set("Content-Type", "application/json");
					opts.body = JSON.stringify(body);
				}
				else
					opts.body = ""+body;
			}

			var okFn = cb,
				errFn = noop;

			if (cb instanceof Array) {
				okFn = cb[0];
				if (cb[1])
					errFn = cb[1];
			}

			function checkStatus(resp) {
				if (resp.status >= 200 && resp.status < 300)
					return resp
				else {
					var err = new Error(resp.status + ": " + resp.statusText)
					err.data = resp;
					return Promise.reject(err);
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

			var event = {type: "fetch", fetch: {method: meth, url: url, body: body}};

			var prom = fetch(url, opts)
				.then(checkStatus)
				// decode data
				.then(reader)
				// invoke provided callbacks, massage/set data
				.then(okFn, errFn)
				// fire any redraws
				.then(
					function(res) {
						res !== false && api.fire(event);
						return res;
					},
					function(err) {
						event.error = err;
						api.fire(event);
						return err;
					}
				);

			prom._fetchArgs = [meth, url, body, [okFn, errFn], opts];

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
			fire: u.raft(function() {
				u.execAll(handlers, arguments);
				return api;
			}),
			prop: function prop(initVal, asyncVal) {		// , model, name (if you want the handler to know ctx)
				var val = initVal;

				var fn = function(newVal, runHandlers) {
					if (arguments.length && newVal !== val) {
						var oldVal = val;
						val = newVal;
						if (runHandlers !== false)
							api.fire({type: "prop", prop: fn, data: {old: oldVal, new: newVal}});
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

				return function(e, node, vm) {
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
	*/
			fetch:	initFetch,

			get:	function(url, query, cb) {
				if (!cb)  cb = query;
				else      url += api.query(query);
				return initFetch("get", url, null, cb);
			},

			delete:	function(url, query, cb) {
				if (!cb)  cb = query;
				else      url += api.query(query);
				return initFetch("delete", url, null, cb);
			},

			post:	function(url, body, cb) {
				return initFetch("post", url, body, cb);
			},

			put:	function(url, body, cb) {
				return initFetch("put", url, body, cb);
			},

			patch:	function(url, body, cb) {
				return initFetch("patch", url, body, cb);
			},

			query: function(obj) {
				if (!u.isObj(obj))
					return "";
				var parts = [],
					enc = encodeURIComponent;
				for (var i in obj)
					parts.push(enc(i) + "=" + enc(obj[i]));
				return parts.length ? ("?" + parts.join("&")) : "";
			},
		};

		return api;
	};
})(domvm);