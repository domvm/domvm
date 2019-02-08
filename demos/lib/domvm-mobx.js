/*! domvm-MobX v0.0 - MIT License - https://github.com/domvm/domvm-mobx */
(function(domvm, mobx, undefined) {
"use strict";


// UTILS:

function noop() {}

// We want the same checks as domvm:
function isPlainObj(val) {	// See: https://github.com/domvm/domvm/blob/3.4.8/src/utils.js#L13
	return val != undefined && val.constructor === Object;		// && typeof val === "object"
}
function isFunc(val) {	// See: https://github.com/domvm/domvm/blob/3.4.8/src/utils.js#L26
	return typeof val === "function";
}



// DESIGN:
// 
// We create a new MobX Reaction for each observer domvm vm (ViewModel).
// The Reaction is used to track the observables used by the render() method. It becomes stale
// when one of the tracked observables changes. Upon becoming stale, the default becameStale() hook
// schedules an async redraw of the vm (the user can setup its own becameStale() hook to change
// the default behavior).
// Lazy rendering: re-rendering is executed only when the observer is stale, which is checked by
// its diff.eq() function. (Rendering can be forced by the user diff() function if setup.)
// Reaction lifecycle: the Reaction is created at the beginning of the first render (ie. just before
// mounting), and destroyed during willUnmount(), which allows it to be reclaimed by the GC. But
// because the vm can be reused, we recreate the Reaction during the render() if we detect that
// the vm is reused.
// Conclusion: we need to replace four methods/hooks on every observer vm: diff.eq(), init(), render()
// and willUnmount(). And we also need to add one hook: becameStale().
// Notes:
// - There is no way to know that a vm is being reused before the execution of its diff()
//	 method (the willMount() hook is fired after the diff() and the render() methods).
// - The Reaction must be destroyed explicitly to prevent wasting computations and resources.
// 
// Links:
// - domvm ViewModel: https://github.com/domvm/domvm/blob/master/src/view/ViewModel.js
// - MobX Reaction: https://github.com/mobxjs/mobx/blob/5.6.0/src/core/reaction.ts
// - Inspirations:
//	 - MobX bindings for Inferno: https://github.com/infernojs/inferno/blob/master/packages/inferno-mobx/src/observer.ts
//	 - mobx-observer (universal bindings): https://github.com/capaj/mobx-observer/blob/master/observer.js
//	 - MobX bindings for Preact: https://github.com/mobxjs/mobx-preact


// Turns a vm into an observer (ie. into a reactive view vm):
function initvm(vm, reactionName) {
	// Uncomment if you need to find all unkeyed vm:
	//if (vm.key === undefined) console.warn("Unkeyed reactive view:", reactionName, vm);
	
	var hooks = vm.hooks || (vm.hooks = {});
	
	vm.mobxObserver = {
		// The reaction name, for debugging:
		name: reactionName,
		// The Reaction instance:
		reaction: undefined,
		// If the current view is stale and need (re-)rendering:
		stale: true,
		// The original diff.eq() if any:
		eq: vm.diff && vm.diff.eq,	// Since domvm 3.4.7
		// The original render():
		render: vm.render,
		// The original hook willUnmount():
		willUnmount: hooks.willUnmount,
	};
	
	// The user can prevent the default becameStale() if he did setup its own function,
	// or if he did set it to false (note: this also checks for null because domvm often
	// uses null for undefined):
	if (hooks.becameStale == undefined) hooks.becameStale = becameStale;
	
	var valFn = vm.diff ? vm.diff.val : noop;
	vm.config({diff: {val: valFn, eq: eq}});	// "vm.config()" has an alias "vm.cfg()" since domvm v3.4.7
	vm.render = render;
	hooks.willUnmount = willUnmount;
}

// Creates the observer Reaction:
function setReaction(vm) {
	var observerData = vm.mobxObserver;
	
	// Useful during development:
	if (observerData.reaction) throw Error("Reaction already set.");
	
	observerData.stale = true;
	observerData.reaction = new mobx.Reaction(observerData.name, function() {
		observerData.stale = true;
		if (vm.hooks.becameStale) vm.hooks.becameStale(vm, vm.data);
	});
	
	// The reaction should be started right after creation. (See: https://github.com/mobxjs/mobx/blob/5.6.0/src/core/reaction.ts#L35)
	// But it doesn't seem to be mandatory... ?
	// Not doing it, as that would trigger becameStale() and a vm.redraw() right now !
	// In case we need it, see convoluted implementation of fireImmediately in MobX autorun(): https://github.com/mobxjs/mobx/blob/5.6.0/src/api/autorun.ts#L146
	//observerData.reaction.schedule();
}

// Destroys the observer Reaction:
function unsetReaction(vm) {
	var observerData = vm.mobxObserver;
	
	// Useful during development:
	if (!observerData.reaction) throw Error("Reaction already unset.");
	
	observerData.reaction.dispose();
	observerData.reaction = undefined;
}

// The default becameStale() assigned to each observer vm's hooks
function becameStale(vm) {
	vm.redraw();
}

// The diff.eq() assigned to each observer vm:
function eq(vm) {
	var observerData = vm.mobxObserver;
	
	if (observerData.stale) return false;	// Re-render.
	else if(observerData.eq) return observerData.eq.apply(this, arguments); // Let diff() choose.
	else return true;	// By default: no re-render.
}

// The render() wrapper assigned to each observer vm:
function render(vm) {
	var observerData = vm.mobxObserver,
		that = this,
		args = arguments,
		result;
	
	// If vm was unmounted and is now being reused:
	if (!observerData.reaction) setReaction(vm);
	
	// This can be run even if the reaction is not stale:
	observerData.reaction.track(function() {
		mobx._allowStateChanges(false, function() {
			result = observerData.render.apply(that, args);
		});
	});
	observerData.stale = false;
	
	return result;
}

// The willUnmount() wrapper assigned to each observer vm's hooks:
function willUnmount(vm) {
	unsetReaction(vm);
	
	var _willUnmount = vm.mobxObserver.willUnmount;
	if (_willUnmount) _willUnmount.apply(this, arguments);
}

// Replaces the init() with our own init():
function wrapInit(target, reactionName) {
	target.init = (function(init) {
		return function(vm) {
			initvm(vm, reactionName);
			if (init) init.apply(this, arguments);
		};
	})(target.init);
}

// Replaces the init() with our own init(), but also checks that init() was not already replaced.
// (Useful during development ?)
function wrapInitOnce(target, reactionName) {
	if (!target.init || !target.init.mobxObserver) {
		wrapInit(target, reactionName);
		target.init.mobxObserver = true;
	}
}

// Turns a view into a domvm-MobX observer view:
function observer(view) {
	// Generate friendly name for debugging (See: https://github.com/infernojs/inferno/blob/dev/packages/inferno-mobx/src/observer.ts#L104)
	var reactionName = view.displayName || view.name || (view.constructor && (view.constructor.displayName || view.constructor.name)) || '<View>';
	reactionName += ".render()";
	// TODO: maybe we could also pass the name as the optional first parameter ?
	//		 (Like in mobx.action(), see: https://mobx.js.org/refguide/api.html#actions)
	//		 That could replace the current reactionName generation which gives poor results in real life code.
	
	
	// We need to hook into the init() of the vm, before that init() is executed, but after
	// all the vm.config(...) have been executed on the vm (because they can change the init()).
	// This is a bit complex depending on the type of the view.
	// Refer to the ViewModel constructor for details:
	//	 https://github.com/domvm/domvm/blob/3.4.8/src/view/ViewModel.js#L48
	
	if (isPlainObj(view)) {
		// view is an object: just set our own init on it.
		wrapInit(view, reactionName);
	}
	else {
		// view is a function: we can't do anything before it is executed, so we wrap it
		// with a function that will set our own init later.
		view = (function(view) {
			return function(vm) {
				var out = view.apply(this, arguments);
				
				if (isFunc(out)) {
					wrapInit(vm, reactionName);
				}
				else {
					// In case multiple executions of view() returns the same object,
					// we want to wrap init only once:
					wrapInitOnce(out, reactionName);
				}
				
				return out;
			};
		})(view);
	}
	
	return view;
}


// Hook into domvm's redrawing to ensure all staled observers are correctly redrawn.
// Fixes issue #2: Redraw bug with domvm's drainQueue() (https://github.com/domvm/domvm-mobx/issues/2)
// In domvm, preventing a parent from re-rendering also prevents all its children.
// But with domvm-MobX we need discrete re-rendering, so we need to ensure that the children
// are actually re-rendered, even when their parents aren't.
// This hook requires domvm v3.4.8
domvm.config({
	didRedraws: function forceRedrawOfStaledObservers(redrawQueue) {
		// We want to redraw the children after the parents, so we sort them by depth:
		var byDepth = [];
		
		// Sorting:
		redrawQueue.forEach(function(vm) {
			// Only keep staled domvm-mobx observers (and check they were not unmounted)
			if (vm.mobxObserver && vm.mobxObserver.stale && vm.node != null) {
				var depth = 0,
					parVm = vm;
				while (parVm = parVm.parent()) depth++;
			
				if (!byDepth[depth]) byDepth[depth] = [];
				byDepth[depth].push(vm);
			}
		});
		
		// Re-rendering in order:
		for (var d = 0; d < byDepth.length; d++) {
			if (byDepth[d]) {
				byDepth[d].forEach(function(vm) {
					// May have been redrawn or unmounted by a parent in the meanwhile:
					if (vm.mobxObserver.stale && vm.node != null) vm.redraw(true);
				});
			}
		}
	}
});



// EXPORTS:

domvm.mobxObserver = observer;

})(window.domvm, window.mobx);