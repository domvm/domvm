import { ViewModelProto } from '../ViewModel';
import { isArr, isFunc, cmpArr, cmpObj } from '../../utils';

ViewModelProto._diff = null;

// @vals should be a callback that returns an array or object of values to shallow-compare
//   if the returned values are the same on subsequent redraw calls, then redraw() is prevented
// @then may be a callback that will run if arrays dont match and receives the old & new arrays which
//   it can then use to shallow-patch the top-level vnode if needed (like apply {display: none}) and
//   return `false` to prevent further redraw()
// if @cfg is a function, it's assumed to be @vals
ViewModelProto.diff = function(cfg) {
	var vm = this;

	if (isFunc(cfg))
		var getVals = cfg;
	else {
		var getVals = cfg.vals;
		var thenFn = cfg.then;
	}

	var oldVals = getVals.call(vm, vm, vm.model, vm.key, vm.opts);
	var cmpFn = isArr(oldVals) ? cmpArr : cmpObj;

	vm._diff = function() {
		var newVals = getVals.call(vm, vm, vm.model, vm.key, vm.opts);
		var isSame = oldVals === newVals || cmpFn(oldVals, newVals);

		if (!isSame) {
			// thenFn must return false to prevent redraw
			if (thenFn != null && thenFn.call(vm, vm, oldVals, newVals) === false)
				isSame = true;

			oldVals = newVals;
		}

		return isSame;
	};
};