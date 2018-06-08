import { noop, isFunc, isArr, cmpArr, cmpObj } from '../utils';
import { preProc } from './preProc';

export function lazyList(items, cfg) {
	var len = items.length;

	var self = {
		items: items,
		length: len,
		// defaults to returning item identity (or position?)
		key: function(i) {
			return cfg.key(items[i], i);
		},
		// default returns 0?
		diff: null,
		tpl: function(i) {
			return cfg.tpl(items[i], i);
		},
		map: function(tpl) {
			cfg.tpl = tpl;
			return self;
		},
		body: function(vnode) {
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
		}
	};

	if (FEAT_DIFF_CMP) {
		if (isFunc(cfg.diff)) {
			self.diff = {
				val: function(i) {
					return cfg.diff(items[i]);
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
	else {
		self.diff = {
			val: function(i) {
				return cfg.diff.val(items[i]);
			},
	        cmp: function(i, donor) {
				return cfg.diff.cmp(donor._diff, self.diff.val(i));
			}
		};
	}

	return self;
}