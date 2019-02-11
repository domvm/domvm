const tagCache = {};

const RE_ATTRS = /\[(\w+)(?:=([-+\w.,]+))?\]/g;

// TODO: id & class should live inside attrs?

export function parseTag(raw) {
	var cached = tagCache[raw];

	if (cached == null) {
		var tag, id, cls, attr;

		tagCache[raw] = cached = {
			tag:	(tag	= raw.match( /^[-\w]+/))		?	tag[0]						: "div",
			id:		(id		= raw.match( /#([-\w]+)/))		? 	id[1]						: null,
			class:	(cls	= raw.match(/\.([-\w.]+)/))		?	cls[1].replace(/\./g, " ")	: null,
			attrs:	null,
		};

		while (attr = RE_ATTRS.exec(raw)) {
			if (cached.attrs == null)
				cached.attrs = {};
			cached.attrs[attr[1]] = attr[2] || "";
		}
	}

	return cached;
}