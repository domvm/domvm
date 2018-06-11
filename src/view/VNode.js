import { assignObj } from '../utils';

export function VNode() {}

export const VNodeProto = VNode.prototype = {
	constructor: VNode,

	type:	null,

	vm:		null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	key:	null,
	ref:	null,
	data:	null,
	hooks:	null,
	ns:		null,

	el:		null,

	tag:	null,
	attrs:	null,
	body:	null,

	flags:	0,

	_diff:	null,

	// pending removal on promise resolution
	_dead:	false,
	// part of longest increasing subsequence?
	_lis:	false,

	idx:	null,
	parent:	null,
};

if (FEAT_STATIC_CLASS) {
	VNodeProto._class = null;
}

if (FEAT_FLUENT_API) {
	assignObj(VNodeProto, {
		a:	function(val) { this.attrs	= val; return this; },
		b:	function(val) { this.body	= val; return this; },
		k:	function(val) { this.key	= val; return this; },
		r:	function(val) { this.ref	= val; return this; },
		h:	function(val) { this.hooks	= val; return this; },
		f:	function(val) { this.flags	= val; return this; },
		d:	function(val) { this.data	= val; return this; },

	//	e:	function(val) { this.events	= val; return this; },
	//	s:	function(val) { this.style	= val; return this; },
	//	t: tag/type
	//	c: class
	//	i: id
	})
}