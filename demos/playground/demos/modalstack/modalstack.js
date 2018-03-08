/* utils */

// https://stackoverflow.com/a/34624648
function copy(o) {
	var _out, v, _key;
	_out = Array.isArray(o) ? [] : {};
	for (_key in o) {
		v = o[_key];
		_out[_key] = (typeof v === "object" && v !== null) ? copy(v) : v;
	}
	return _out;
}

// https://github.com/jaredreich/tread
function merge(oldObject, newObject, strict) {
	var obj = oldObject
	for (var key in newObject) {
		if (typeof obj[key] === 'object' && obj[key] !== null) {
			merge(obj[key], newObject[key])
		} else {
			if (strict) {
				if (obj.hasOwnProperty(key)) {
					obj[key] = newObject[key]
				}
			} else {
				obj[key] = newObject[key]
			}
		}
	}
	return obj
}

function copyMerge(targ, src) {
	return merge(copy(targ), copy(src));
}

/* lib */

var el = domvm.defineElement,
	tx = domvm.defineText;

function ModalStack(ctnr, opts) {
	this.opts = opts || {};

	this.stack = [];

	this.vm = null;

	this.push = function(cfg) {
		cfg = copy(cfg);
		this.stack.push(cfg);

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
}

function ModalStackView(vm, mod) {
	var opts = mod.opts;

	if (opts.popOnEsc) {
		document.addEventListener("keyup", function(e) {
			if (e.keyCode == 27)
				mod.pop();
		});
	}

	if (opts.popOnClick) {
		document.addEventListener("click", function(e) {
			if (e.target.matches(".dvm-modal-overlay")) {
				mod.pop();
				e.stopPropagation();
			}
		});
	}

	function initAttrs(cfg) {
		return (cfg.attrs = {_hooks: genHooks(cfg)});
	}

	function updAttrs(cfg, attrs) {
		return (cfg.attrs = copyMerge(cfg.attrs || {}, attrs || {}));
	}

	function genHooks(cfg) {
		var push = cfg.onpush;
		var pop = cfg.onpop;

		var hooks = {};

		if (push) {
			if (push.initial) {
				hooks.willInsert = function(node) {
					node.patch(updAttrs(cfg, push.initial(node)));
				};
			}

			if (push.delayed) {
				hooks.didInsert = function(node) {
					node.patch(updAttrs(cfg, push.delayed(node)));
					// must determine if there's a transition to set up hook, assumed yes for now
					// http://codepen.io/csuwldcat/pen/EempF
					if (push.settled) {
						var ev = "transitionend";
						var patch = function() {
							node.patch(updAttrs(cfg, push.settled(node)));
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
						node.patch(updAttrs(cfg, pop.initial(node)));

					if (pop.delayed) {
						node.patch(updAttrs(cfg, pop.delayed(node)));		// may need raf wrap

						return new Promise(function(resolve, reject) {
							node.el.addEventListener("transitionend", resolve);
						});
					}
				};
			}
		}

		return Object.keys(hooks).length > 0 ? hooks : null;
	}

	function modalTpl(i, stack) {
		var cfg = stack[i];
		var isLast = i === stack.length - 1;

		return el("aside.dvm-modal-overlay", cfg.overlay.attrs || initAttrs(cfg.overlay), [
			el("section.dvm-modal-content", cfg.content.attrs || initAttrs(cfg.content), [
				cfg.content.body(),
				isLast ? null : modalTpl(i + 1, stack),
			])
		]);

	}

	return function() {
		return modalTpl(0, mod.stack);
	};
}


/* usage */

var el = domvm.defineElement,
	tx = domvm.defineText;

var modalA = {
	overlay: {
		onpush: {
			initial: function(node) { return {style: {opacity: 0, background: "rgba(128,255,255,.5)", position: "absolute"}}; },			// opacity: 1
			delayed: function(node) { return {style: {opacity: 1, transition: "250ms"}}; },
		},
		onpop: {
			delayed: function(node) { return {style: {opacity: 0, transition: "250ms"}}; },
		}
	},
	content: {
		body: function() { return (
			el(".test1", [
				el("p", "Do you see any Teletubbies in here? Do you see a slender plastic tag clipped to my shirt with my name printed on it? Do you see a little Asian child with a blank expression on his face sitting outside on a mechanical helicopter that shakes when you put quarters in it? No? Well, that's what you see at a toy store. And you must think you're in a toy store, because you're here shopping for an infant named Jeb."),
				el("button.dismiss", {onclick: dismiss}, "Dismiss"),
			])
		)},
		onpush: {
			initial: function(node) { return {style: {height: 300, width: 600}}; },															// immediate
		//	delayed: function(node) { return {style: {color: "red", height: 600, transform: "rotateZ(360deg)", transition: "250ms"}}; },	// nextTick
		//	settled: function(node) { return {style: {color: "red", height: 600}}; },														// transitionend (shorthand for simply unsetting transition?)
		},
		onpop: {
		//	delayed: function(node) { return {style: {transition: "2s", opacity: 0}}; },
		//	initial: function(node) { return null; },
		//	delayed: function(node) { return {style: {color: "red", height: 600, transition: "500ms"}}; },							// nextTick
		}
	},
};

var modalB = {
	overlay: {
		onpush: {
			initial: function(node) { return {style: {opacity: 0, background: "rgba(128,128,255,.5)", position: "absolute"}}; },
			delayed: function(node) { return {style: {opacity: 1, transition: "250ms"}}; },
		},
		onpop: {
			delayed: function(node) { return {style: {opacity: 0, transition: "250ms"}}; },
		}
	},
	content: {
		body: function() { return (
			el(".test2", [
			   tx("bar"),
			   el("button.dismiss", {onclick: dismiss}, "Dismiss"),
			])
		)},
		onpush: {
			initial: function(node) { return {style: {height: 200, width: 400, transform: "translateX(-180px)"}}; },
			delayed: function(node) { return {style: {transform: "translateX(0)", transition: "250ms"}}; },
		},
		onpop: {
			initial: function(node) { return {style: {transform: "translateY(100px)", transition: "250ms"}}; },
		//	delayed: function(node) { return {style: {color: "red", height: 600, transition: "500ms"}}; },	// nextTick
		}
	},
};

var modalC = {
	overlay: {
		onpush: {
			initial: function(node) { return {style: {opacity: 0, background: "rgba(255,128,255,.5)", position: "absolute"}}; },
			delayed: function(node) { return {style: {opacity: 1, transition: "250ms"}}; },
		},
		onpop: {
			delayed: function(node) { return {style: {opacity: 0, transition: "250ms"}}; },
		}
	},
	content: {
		body: () =>
			el(".test3", [
				tx("baz"),
				el("button.dismiss", {onclick: dismiss}, "Dismiss"),
			])
		,
		onpush: {
			initial: function(node) { return {style: {height: 600, transform: "rotateZ(-180deg)"}}; },
			delayed: function(node) { return {style: {color: "blue", height: 200, transform: "none", transition: "250ms"}}; },
		//	settled: function(node) { return {style: {transform: null, transition: "0s"}}; },
		},
		onpop: {
			initial: function(node) { return {style: {height: 600, transform: "rotateZ(-180deg)", transition: "250ms"}}; },
		//	delayed: function(node) { return {style: {color: "red", height: 600, transition: "500ms"}}; },	// nextTick
		}
	},
};

function dismiss() {
	modals.pop();
}

var modals = new ModalStack(document.body, {popOnEsc: true, popOnClick: true});

setTimeout(function() {
	modals.push(modalA);
}, 0);

setTimeout(function() {
	modals.push(modalB);
}, 1000);

setTimeout(function() {
	modals.push(modalC);
}, 2000);

/*
setTimeout(function() {
	modals.pop();
}, 3000);

setTimeout(function() {
	modals.pop();
}, 4000);

setTimeout(function() {
	modals.pop();
}, 5000);
*/