(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Modals = factory());
}(this, (function () { 'use strict';
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

	var el = domvm.defineElement;

	function Modals(opts) {
		this.opts = opts || {};

		var stack = this.stack = [];

		var vm = this.vm = domvm.createView(ModalsView, this);

		this.push = function(cfg) {
			stack.push(copy(cfg));
			vm.redraw();
		};

		this.pop = function(howMany) {
			howMany = howMany || 1;

			while (howMany--)
				stack.pop();

			vm.redraw();
		};

		this.mount = function(ctnr) {
			vm.mount(ctnr);
		};
	}

	function ModalsView(vm, mods) {
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
							var setPatch = function() {
								node.patch(updAttrs(cfg, push.settled(node)));
							};
							node.patch(updAttrs(cfg, {ontransitionend: [setPatch]}));
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
							return new Promise(function(resolve, reject) {
								node.patch(updAttrs(cfg, merge(pop.delayed(node), {ontransitionend: [resolve]})));
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

			var ovrAttrs = copy(cfg.overlay.attrs || initAttrs(cfg.overlay));
			var cntAttrs = copy(cfg.content.attrs || initAttrs(cfg.content));

			return el(".dv-modals-overlay", ovrAttrs, [
				el(".dv-modals-content", cntAttrs, [
					cfg.content.body(),
					isLast ? null : modalTpl(i + 1, stack),
				])
			]);

		}

		return function() {
			return el(".dv-modals", [
				mods.stack.length > 0 && modalTpl(0, mods.stack)
			]);
		};
	}

	return Modals;
})));


/* usage */

var modals = new Modals();

modals.mount(document.body);

function dismiss() {
	modals.pop();
}

// pop modal on overlay click
function overlayClick(e) {
	if (e.target == e.currentTarget)
		modals.pop();
}

// pop modal on esc
document.addEventListener("keyup", function(e) {
	if (e.keyCode == 27)
		modals.pop();
});

var el = domvm.defineElement,
	tx = domvm.defineText;

var modalA = {
	overlay: {
		onpush: {
			initial: function(node) { return {style: {opacity: 0, background: "rgba(128,255,255,.5)", position: "absolute"}, onclick: overlayClick}; },			// opacity: 1
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
			initial: function(node) { return {style: {opacity: 0, background: "rgba(128,128,255,.5)", position: "absolute"}, onclick: overlayClick}; },
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
			initial: function(node) { return {style: {opacity: 0, background: "rgba(255,128,255,.5)", position: "absolute"}, onclick: overlayClick}; },
			delayed: function(node) { return {style: {opacity: 1, transition: "250ms"}}; },
		},
		onpop: {
			delayed: function(node) { return {style: {opacity: 0, transition: "250ms"}}; },
		}
	},
	content: {
		body: function() { return (
			el(".test3", [
				tx("baz"),
				el("button.dismiss", {onclick: dismiss}, "Dismiss"),
			])
		)},
		onpush: {
			initial: function(node) { return {style: {height: 600, transform: "rotateZ(-180deg)"}}; },
			delayed: function(node) { return {style: {color: "blue", height: 200, transform: "none", transition: "250ms"}}; },
		//	settled: function(node) { return {style: {border: "1px solid red", transition: "0s"}}; },
		},
		onpop: {
			initial: function(node) { return {style: {height: 600, transform: "rotateZ(-180deg)", transition: "250ms"}}; },
		//	delayed: function(node) { return {style: {color: "red", height: 600, transition: "500ms"}}; },	// nextTick
		}
	},
};

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