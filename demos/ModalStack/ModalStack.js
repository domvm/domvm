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

// ----------------------------------------------------

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
					node.patch(updAttrs(cfg, push.initial));
				};
			}

			if (push.delayed) {
				hooks.didInsert = function(node) {
					node.patch(updAttrs(cfg, push.delayed));
					// must determine if there's a transition to set up hook, assumed yes for now
					// http://codepen.io/csuwldcat/pen/EempF
					if (push.settled) {
						var ev = "transitionend";
						var patch = function() {
							node.patch(updAttrs(cfg, push.settled));
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
						node.patch(updAttrs(cfg, pop.initial));

					if (pop.delayed) {
						node.patch(updAttrs(cfg, pop.delayed));		// may need raf wrap

						return new Promise(function(resolve, reject) {
							node.el.addEventListener("transitionend", resolve);
						});
					}
				};
			}
		}

		return Object.keys(hooks).length > 0 ? hooks : null;
	}

	function popOne(e) {
		mod.pop();
		return false;
	}

	function modalTpl(i, stack) {
		var cfg = stack[i];
		var isLast = i === stack.length - 1;

		// requires overlay.onpush.initial to exist
		if (opts.popOnClick)
			cfg.overlay.onpush.initial.onclick = {".dvm-modal-overlay": popOne};

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