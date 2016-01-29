(function(domvm) {
	"use strict";

	domvm.watch = function(handler) {
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

			return fetch(url, opts)
				.then(checkStatus)
				.then(reader)
				.then(ok, err)
				.then(function(res) {
					if (res !== false)
						handler();
				}, noop);
		}

		return {
			prop: function prop(initVal) {		// , model, name (if you want the handler to know ctx)
				var val = initVal;

				var fn = function(newVal, runHandler) {
					if (arguments.length && newVal !== val) {
						var oldVal = val;
						val = newVal;
						if (handler && runHandler !== false)
							handler();
					}

					return val;
				};

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
		}
	};
})(domvm);