import { noop, isFunc, isArr, cmpArr, cmpObj } from '../utils';
import { preProc } from './preProc';
import { LAZY_LIST, KEYED_LIST } from './initElementNode';

export function List(items, diff, key) {
	var self = this, tpl;

	var len = items.length;

	self.flags = LAZY_LIST;

	self.items = items;

	self.length = len;

	self.key = i => null;

	self.diff = {
		val: function(i) {
			return diff.val(items[i]);
		},
		cmp: function(i, donor) {
			return diff.cmp(donor._diff, self.diff.val(i));
		}
	};

	// TODO: auto-import diff and keygen into some vtypes?
	self.tpl = i => tpl(items[i], i);

	self.map = tpl0 => {
		tpl = tpl0;
		return self;
	};

	self.body = function(vnode) {
		var nbody = Array(len);

		for (var i = 0; i < len; i++) {
			var vnode2 = self.tpl(i);

		//	if ((vnode.flags & KEYED_LIST) === KEYED_LIST && self. != null)
		//		vnode2.key = getKey(item);

			vnode2._diff = self.diff.val(i);

			nbody[i] = vnode2;

			// run preproc pass (should this be just preProc in above loop?) bench
			preProc(vnode2, vnode, i);
		}

		// replace List with generated body
		vnode.body = nbody;
	};

	if (key != null) {
		self.flags |= KEYED_LIST;
		self.key = i => key(items[i], i)
	}

	if (FEAT_DIFF_CMP) {
		if (isFunc(diff)) {
			self.diff = {
				val: function(i) {
					return diff(items[i]);
				},
				cmp: function(i, donor) {
					var o = donor._diff,
						n = self.diff.val(i);

					var cmpFn = isArr(o) ? cmpArr : cmpObj;
					return !(o === n || cmpFn(o, n));
				}
			};
		}
	}
}

export function list(items, diff, key) {
	return new List(items, diff, key);
}