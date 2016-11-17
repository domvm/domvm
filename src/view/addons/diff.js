import { ViewModelProto } from '../ViewModel';
import { isArr, cmpArr, cmpObj } from '../../utils';

ViewModelProto._diff = null;

// @diff should be a callback that returns an array of values to shallow-compare
//   if the returned values are the same on subsequent redraw calls, then redraw() is prevented
// @diff2 may be a callback that will run if arrays dont match and recieves the old & new arrays which
//   it can then use to shallow-patch the top-level vnode if needed (like apply {display: none}) and
//   return false to prevent further redraw()
ViewModelProto.diff = function(cfg) {
	var vm = this;

	var getVals = cfg.vals;
	var thenFn = cfg.then;

	var oldVals = getVals(vm, vm.model, vm.key, vm.opts);
	var cmpFn = isArr(oldVals) ? cmpArr : cmpObj;

	vm._diff = function() {
		var newVals = getVals(vm, vm.model, vm.key, vm.opts);
		var isSame = cmpFn(oldVals, newVals);

		if (!isSame) {
			// thenFn must return false to prevent redraw
			if (thenFn != null && thenFn(vm, oldVals, newVals) === false)
				isSame = true;

			oldVals = newVals;
		}

		return isSame;
	};
};