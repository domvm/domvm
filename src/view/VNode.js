import { views } from './createView';

export function VNode(type) {
	this.type = type;
}

VNode.prototype = {
	constructor: VNode,

	type:	null,

	get vm() {
		var n = this;
		while (n.vmid == null)
			n = n.parent;
		return views[n.vmid];
	},

	vmid:	null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	key:	null,
	ref:	null,
	data:	null,
	hooks:	null,
	html:	false,

	el:	null,

	tag:	null,
	attrs:	null,
	body:	null,
	fixed: false,

	_class:	null,

	idx:	null,
	parent:	null,

	// transient flags maintained for cleanup passes, delayed hooks, etc
//	_recycled:		false,		// true when findDonor/graft pass is done
//	_wasSame:		false,		// true if _diff result was false
//	_delayedRemove:	false,		// true when willRemove hook returns a promise

//	_setTag: function() {},

	/*
	// break out into optional fluent module
	key:	function(val) { this.key	= val; return this; },
	ref:	function(val) { this.ref	= val; return this; },		// deep refs
	data:	function(val) { this.data	= val; return this; },
	hooks:	function(val) { this.hooks	= val; return this; },		// h("div").hooks()
	html:	function(val) { this.html	= true; return this.body(val); },

	body:	function(val) { this.body	= val; return this; },
	*/
};