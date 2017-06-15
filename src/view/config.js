import { noop, assignObj } from '../utils';

export const globalCfg = {
	onevent: noop
};

export function config(newCfg) {
	assignObj(globalCfg, newCfg);
}