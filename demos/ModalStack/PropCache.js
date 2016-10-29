function PropCache() {
	var oCache = new Map(),
		sCache = (function() {
			var api = {
				get:	function(key)		{ return api._[key];			},
				has:	function(key)		{ return api._[key] != null;	},
				set: 	function(key, val)	{ api._[key] = val;				},
				delete:	function(key)		{ delete api._[key];			},
				clear:	function()			{ api._ = {};					},
				_: {},
			};

			return api;
		})();

	function getCache(key) {
		switch (typeof key) {
			case 'string': case 'number':	return sCache;
			case 'object': case 'function':	return oCache;
		}
	}

	function copy(val) {
		return cloner.deep.copy(val);
	}

	function merge(targ, src) {
		return cloner.deep.merge(targ, src);
	}

	// upsert + fetch
	this.upd = function(key, val, repl) {
		var cache = getCache(key);

		if (val != null) {
			if (!repl)
				val = merge(val, cache.get(key) || {});

			cache.set(key, copy(val));
		}

		return cache.has(key) ? copy(cache.get(key)) : null;
	};
}