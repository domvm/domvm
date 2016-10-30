var el = domvm.defineElement,
	tx = domvm.defineText;

function ModalStack(ctnr, opts) {
	this.opts = opts || {};

	this.stack = [];

	this.push = function(modal) {
		this.stack.push(modal);

		if (this.stack.length == 1)
			this.vm = domvm.createView(ModalStackView, this).mount(ctnr);
		else
			this.vm.redraw();
	};

	this.pop = function(howMany) {
		howMany = howMany || 1;

		while (howMany--)
			this.stack.pop();		// validate, etc

		if (this.stack.length == 0)
			this.vm.unmount();
		else
			this.vm.redraw();
	};

	this.vm = null;
}

function ModalStackView(vm, mod) {
	var opts = mod.opts;

	if (opts.popOnEsc) {
		document.addEventListener("keyup", function(e) {
			if (e.keyCode == 27)
				mod.pop();
		});
	}

	function genProps(handle, cache) {
		var push = handle.onpush;
		var pop = handle.onpop;

		var hooks = {};

		if (push) {
			if (push.initial) {
				hooks.willInsert = function(node) {
					node.patch(cache.upd(handle, push.initial));
				};
			}
			if (push.delayed) {
				hooks.didInsert = function(node) {
					node.patch(cache.upd(handle, push.delayed));
					// must determine if there's a transition to set up hook, assumed yes for now
					// http://codepen.io/csuwldcat/pen/EempF
					if (push.settled) {
						var ev = "transitionend";
						var patch = function() {
							node.patch(cache.upd(handle, push.settled));
							node.el.removeEventListener(ev, patch);
						};
						node.el.addEventListener(ev, patch);
					}
				};
			}
		}

		if (pop) {
			if (pop.initial || pop.delayed) {
				hooks.willRemove = function(node) {
					if (pop.initial)
						node.patch(cache.upd(handle, pop.initial));

					if (pop.delayed) {
						node.patch(cache.upd(handle, pop.delayed));		// may need raf wrap

						return new Promise(function(resolve, reject) {
							node.el.addEventListener("transitionend", resolve);
						});
					}
				};
			}
		}

		var hasHooks = Object.keys(hooks).length > 0;
		return cloner.deep.merge(hasHooks ? {_hooks: hooks} : {}, cache.upd(handle) || push.initial || {});
	}

	var oProps = new PropCache();
	var cProps = new PropCache();

	function popOne(e) {
		mod.pop();
		return false;
	}

	function modalTpl(i, stack) {
		var modal = stack[i];
		var isLast = i === stack.length - 1;

		// requires overlay.onpush.initial to exist
		if (opts.popOnClick)
			modal.overlay.onpush.initial.onclick = {".dvm-modal-overlay": popOne};

		return el("aside.dvm-modal-overlay", genProps(modal.overlay, oProps), [
			el("section.dvm-modal-content", genProps(modal.content, cProps), [
				modal.content.body,
				isLast ? null : modalTpl(i + 1, stack),
			])
		]);
	}

	return function() {
		return modalTpl(0, mod.stack);
	};
}