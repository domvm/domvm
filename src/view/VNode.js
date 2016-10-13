import { views } from './createView';

export function VNode(type) {
	this._type = type;
}

VNode.prototype = {
	constructor: VNode,

	_type:	null,

	get _vm() {
		var n = this;
		while (n._vmid == null)
			n = n._parent;
		return views[n._vmid];
	},

	_vmid:	null,

	// all this stuff can just live in attrs (as defined) just have getters here for it
	_key:	null,
	_ref:	null,
	_data:	null,
	_hooks:	null,
	_html:	false,

	_el:	null,

	_tag:	null,
	_attrs:	null,
	_body:	null,
	_fixed: false,

	_class:	null,

	_idx:	null,
	_parent:null,

	// transient flags maintained for cleanup passes, delayed hooks, etc
	_recycled:		false,		// true when findDonor/graft pass is done
	_wasSame:		false,		// true if _diff result was false
	_delayedRemove:	false,		// true when willRemove hook returns a promise

//	_setTag: function() {},

	// break out into optional fluent module
	key:	function(val) { this._key	= val; return this; },
	ref:	function(val) { this._ref	= val; return this; },		// deep refs
	data:	function(val) { this._data	= val; return this; },
	hooks:	function(val) { this._hooks	= val; return this; },		// h("div")._hooks()
	html:	function(val) { this._html	= true; return this.body(val); },

	body:	function(val) { this._body	= val; return this; },
};