import { noop, isArr, cmpArr, cmpObj } from '../../utils';
import { preProc } from '../preProc';
import { KEYED_LIST } from '../initElementNode';

export function lazyBody(items, cfg) {
	return new LazyBody(items, cfg.key, cfg.diff, cfg.tpl);
}

export function LazyBody(items, key, diff, tpl) {
	this.items = items;
	this.length = items.length;
	this.key = function(i) {
		return key(items[i], i);
	};
	this.diff = function(i, donor) {
		var newVals = diff(items[i], i);
		if (donor == null)
			return newVals;
		var oldVals = donor._diff;
		var same = newVals === oldVals || isArr(oldVals) ? cmpArr(newVals, oldVals) : cmpObj(newVals, oldVals);
		return same || newVals;
	};
	this.map(tpl);
}

LazyBody.prototype = {
	constructor: LazyBody,

	items: null,
	length: null,
	key: null,		// defaults to returning item identity (or position?)
	diff: null,		// returns 0
	tpl: null,		// or return some error tpl
	map: function(tpl) {
		this.tpl = function(i) {
			return tpl(this.items[i]);
		};
		return this;
	},
	body: function(vnode) {
		var items = this.items;

		var nbody = Array(items.length);

		for (var i = 0; i < items.length; i++) {
			var vnode2 = this.tpl(i);

		//	if ((vnode.flags & KEYED_LIST) === KEYED_LIST && self. != null)
		//		vnode2.key = getKey(item);

			vnode2._diff = this.diff(i);			// holds oldVals for cmp

			nbody[i] = vnode2;

			// run preproc pass (should this be just preProc in above loop?) bench
			preProc(vnode2, vnode, i);
		}

		// replace List with generated body
		vnode.body = nbody;
	}
};