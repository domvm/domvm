import { noop, assignObj } from '../utils';

export const globalCfg = {
	onevent: noop,
	autoPx: function(name, val) {
		return val;
	},
};

export function config(newCfg) {
	assignObj(globalCfg, newCfg);
}