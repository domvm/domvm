/**
* Copyright (c) 2015, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.js - DOM ViewModel
* A thin, fast, dependency-free vdom diffing lib
* https://github.com/leeoniya/domvm
*/

( // Module boilerplate to support commonjs, browser globals and AMD.
	(typeof module === "object" && typeof module.exports === "object" && function (m) { module.exports = m(); }) ||
	(typeof define === "function" && function (m) { define("domvm", m); }) ||
	(function (m) { window.domvm = m(); })
)(function () {
	"use strict";

	var NS = {
		svg: "http://www.w3.org/2000/svg",
		math: "http://www.w3.org/1998/Math/MathML",
	};
	var voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;
	var seenTags = {};  // memoized parsed tags, todo: clean this?

	var win = typeof window == "undefined" ? {} : window;
	var doc = document;

	var TYPE_ELEM = 1;
	var TYPE_TEXT = 2;
//  var TYPE_RAWEL = 3;
	var TYPE_FRAG = 4;

	var REDRAW_NONE = 0;
	var REDRAW_ROOT = 1;
	var REDRAW_SELF = 2;

	var DONOR_DOM	= 1;
	var DONOR_NODE	= 2;

	createView.viewScan = false;	// enables aggressive unkeyed view reuse
	createView.useRaf = true;
//	createView.useDOM = true;
	createView.autoRedraw = REDRAW_NONE;

	return createView;

	// creates closure
	function createView(viewFn, model, _key, opts, rendArgs, parentNode, idxInParent) {
		var isRootNode = !parentNode;

		// for domvm([MyView, model, _key])
		if (isArr(viewFn)) {
			model = viewFn[1];
			_key = viewFn[2];
			opts = viewFn[3];
			rendArgs = viewFn[4];
			viewFn = viewFn[0];
		}

		var vm = {
			node: null,
			view: [viewFn, model, _key],
			redraw: createView.useRaf ? raft(redraw) : redraw,
			emit: emit,
			refs: {},
			html: function() {
				return collectHtml(vm.node);
			},
			mount: function(el) {		// appendTo?
				hydrateNode(vm.node);
				el.insertBefore(vm.node.el, null);
				return vm;
			},
			attach: function(el) {
				hydrateWith(vm.node, el);
				return vm;
			},
			destroy: destroy,

			// internal util funcs
			moveTo: moveTo,
			updIdx: updIdx,
			wrapHandler: wrapHandler,
		};

		var view = viewFn.call(model, vm, model, _key);

		view = isFunc(view) ? {render: view} : view;
		view.on = view.on || {};
		view.on._redraw = redraw;

		vm.view[3] = view;

		// creates a curried emit
		emit.create = function() {
			var args = arguments;
			return function() {
				emit.apply(null, args);
			};
		};

		// targeted by depth or by key, root = 1000
		emit.redraw = function(targ) {
			targ = isVal(targ) ? targ : 1000;

			emit("_redraw:" + targ);

		//	return function() {
		//		emit("_redraw:" + targ);		// todo: pass through args
		//	};
		};

		if (parentNode)
			return moveTo(parentNode, idxInParent, rendArgs);
		else
			return redraw(rendArgs);

		// transplants node into tree, optionally updating rendArgs
		function moveTo(parentNodeNew, idxInParentNew, rendArgsNew) {
			// null out in old parent
			if (parentNode)
				parentNode.body[idxInParent] = null;		// splice?

			parentNode = parentNodeNew;
			updIdx(idxInParentNew);

			return redraw(rendArgsNew, false);
		}

		function updIdx(idxInParentNew) {
			idxInParent = idxInParentNew;
		}

		function redraw(rendArgsNew, isRedrawRoot) {
			rendArgs = rendArgsNew || rendArgs;

			var old = vm.node;
			var def = vm.view[3].render.apply(model, rendArgs);
			var node = initNode(def, parentNode, idxInParent, vm);

			node.key = isVal(_key) ? _key : node.key;

			node.vm = vm;
			vm.node = node;

			var donor = old;

			// clear donor if new tag, will replaceNode
			if (old && (node.type !== old.type || node.tag !== old.tag)) {
				donor = null;
				var repl = true;
			}

			buildNode(node, donor);

			// slot sef into parent
			if (parentNode)
				parentNode.body[idxInParent] = node;

			if (isRedrawRoot !== false) {
				old && cleanNode(old);

				// hydrate on all but initial root createView/redraw (handled in mount()/attach())
				(old || !isRootNode) && hydrateNode(node);

				if (repl) {
					old.el.parentNode.replaceChild(node.el, old.el);
					old.el = null;
				}
			}

			setTimeout(function() {
				vm.refs = {};
				collectRefs(node, vm);
				exec(vm.view[3].after);
			}, 0);

			return vm;
		}

		function destroy(live) {
			if (parentNode) {
				if (live) {
					for (var i = idxInParent + 1; i < parentNode.body.length; i++) {
						var n = parentNode.body[i];
						n.idx = i - 1;
						if (n.vm)
							n.vm.updIdx(n.idx);
					}

					parentNode.body.splice(idxInParent, 1);
				}
				else
					parentNode.body[idxInParent] = null;
			}

			cleanNode(vm.node, true);

			vm.node.vm = null;

			// more cleanup?

			exec(vm.view[3].cleanup);
		}

		function wrapHandler(fn, filt) {
			var matches = isVal(filt) ? function(e) { return e.target.matches(filt); } : isFunc(filt) ? filt : null;

			var handler = function(e) {
				if (!filt || matches(e)) {
					if (fn.call(model, e) === false) {
						e.preventDefault();
						e.stopPropagation();		// yay or nay?
					}
				}

				switch (createView.autoRedraw) {
					case REDRAW_SELF: redraw(); break;
					case REDRAW_ROOT: emit.redraw(); break;
				}
			};

			// expose original for cmp
			handler._fn = fn;

			return handler;
		}

		function emit(event) {
			var depth = null;

			// TODO: by key also
			var evd = event.split(":");

			if (evd.length == 2) {
				event =  evd[0];
				depth = +evd[1];
			}

			var args = Array.prototype.slice.call(arguments, 1);

			var targ = vm.node;

			if (depth !== null) {
				while (depth && targ.parent) {
					targ = targ.parent;
					if (targ.vm)
						depth--;
				}

				var ons = targ.vm ? targ.vm.view[3].on : null;
				var evh = ons ? ons[event] : null;
				evh && evh.apply(null, args);
			}
			else {
				while (targ) {
					if (targ.vm) {
						var ons = targ.vm.view[3].on;
						var evh = ons ? ons[event] : null;
						if (evh) {
							var res = evh.apply(null, args);
							if (res === false) break;
						}
					}

					targ = targ.parent;
				}
			}
		}
	}

	// absorbs active dom, assumes it was built by dumping the html()
	// of this node into innerHTML (isomorphically)
	// (todo: bind/refs)
	function hydrateWith(node, el) {
		node.el = el;

		if (isArr(node.body)) {
			for (var i = 0; i < node.body.length; i++) {
				var node2 = node.body[i];
				// handle empty text nodes stripped by innerHTML, inject them into DOM here
				var isEmptyTextNode = node2 && node2.type === TYPE_TEXT && node2.body === "";
				if (isEmptyTextNode)
					el.insertBefore(document.createTextNode(""), el.childNodes[i] || null);

				hydrateWith(node2, el.childNodes[i]);
			}
		}
	}

	function cleanNode(node, removeSelf) {
		if (isArr(node.body)) {
			node.body.forEach(function(n, i) {
				if (!n) return;

				if (n.vm)
					n.vm.destroy();
				else {
					if (n.el && n.el.parentNode)
						 n.el.parentNode.removeChild(n.el);
					else
						cleanNode(n);
				}
			});

			node.body = null;
		}

		if (removeSelf && node.el) {
			node.el.parentNode.removeChild(node.el);
			node.el = null;
		}
	}

	// builds out node, excluding views.
	// collects keyMap needed for grafting
	function initNode(def, parentNode, idxInParent, ownerVm) {
		var node = procNode(def, ownerVm);

		node.parent = parentNode;
		node.idx = idxInParent;
		node.ns = parentNode && parentNode.ns ? parentNode.ns : (node.tag === "svg" || node.tag === "math") ? node.tag : null;
	//	node.svg = parentNode ? parentNode.svg : node.tag === "svg";
	//	node.math = parentNode ? parentNode.math : node.tag === "math";

		if (isArr(node.body)) {
			var keyMap = {}, anyKeys = false;

			for (var i = 0, len = node.body.length; i < len; i++) {
				var def2 = node.body[i];

				var key = null, node2 = null;

				// handle arrays of arrays, avoids need for concat() in tpls
				if (isArr(def2) && isArr(def2[0])) {
					insertArr(node.body, def2, i, 1);
					len = node.body.length;
					i--; continue;	// avoids de-opt
				}

				if (isFunc(def2))
					def2 = [def2];

				if (isArr(def2) && isFunc(def2[0]))
					key = def2[2];
				else {
					node2 = initNode(def2, node, i, ownerVm);
					key = node2.key;
				}

				if (isVal(key)) {
					keyMap[key] = i;
					anyKeys = true;
				}

				node.body[i] = node2 || def2;
			}

			if (anyKeys)
				node.keyMap = keyMap;
		}

		return node;
	}

	// def is tpl returned by render()
	// old is matched donor vnode obj
	function buildNode(node, donor) {
		if (donor)
			graftNode(donor, node);

		if (isArr(node.body)) {
			node.body.forEach(function(kid, i) {
				var isView = isArr(kid);

				if (donor) {
					var donor2loc = findDonor(kid, node, donor);	// , i, i

					if (donor2loc !== null) {
						var donor2idx = donor2loc[0];
						var donor2type = donor2loc[1];

						var donor2 = donor.body[donor2idx];

						if (isView && donor2.vm) {
							if (donor2type === DONOR_NODE)
								donor2.vm.moveTo(node, i, kid[3]);
							else if (donor2type === DONOR_DOM) {
								// TODO: instead, re-use old dom with new node here (loose match)
								createView.apply(null, [kid[0], kid[1], kid[2], kid[3], kid[4], node, i]);
								return;
							}
						}
						else
							node.body[i] = buildNode(kid, donor2);

						return;
					}
				}
				// fall through no donor found
				if (isView)
					createView.apply(null, [kid[0], kid[1], kid[2], kid[3], kid[4], node, i]);
			});
		}

		return node;
	}

	function hydrateNode(node) {
		var wasDry = !node.el;

		if (node.type == TYPE_ELEM) {
			if (wasDry) {
				node.el = node.ns ? doc.createElementNS(NS[node.ns], node.tag) : doc.createElement(node.tag);

				if (node.vm)
					node.el._vm = node.vm;

				node.props && patchProps(node);
			}

			if (isArr(node.body)) {
				node.body.forEach(function(n2, i) {
					hydrateNode(n2);
				});
			}
			// for body defs like ["a", "blaahhh"], entire body can be dumped at once
			else if (wasDry && isVal(node.body))
				node.el.textContent = node.body;
		}
		// for body defs like ["foo", ["a"], "bar"], create separate textnodes
		else if (node.type == TYPE_TEXT && wasDry)
			node.el = doc.createTextNode(node.body);

		// slot this element into correct position
		var par = node.parent;

		// insert and/or reorder
		if (par && par.el && par.el.childNodes[node.idx] !== node.el)
			par.el.insertBefore(node.el, par.el.childNodes[node.idx]);
	}

	function findDonor(node, newParent, oldParent, fromIdx, toIdx) {
		var newIsView = isArr(node);
		var newKey = newIsView ? node[2] || null : node.key;
		var oldMap = oldParent.keyMap;
		var newMap = newParent.keyMap;
		var oldBody = oldParent.body;
		var newBody = newParent.body;

		// fast exact match by key
		if (newKey !== null && oldMap && isVal(oldMap[newKey]))
			return [oldMap[newKey], DONOR_NODE];

		// if from or to > newbody length, return null
		// todo: from keys here
		fromIdx = fromIdx || 0;
		if (fromIdx > oldBody.length - 1) return null;
		toIdx = toIdx === 0 ? 0 : toIdx || oldBody.length - 1;

		var approx = null;

		// else search for similar & not keyed in newKeymap
		for (var i = fromIdx; i <= toIdx; i++) {
			var o = oldBody[i];
			if (o === null || !o.el) continue;

			// views can only graft from other views
			if (newIsView && o.vm) {
				// approx match by viewFn
				if (o.vm.view[0] === node[0]) {
					// exact match by model
					if (o.vm.view[1] === node[1])
						return [i, DONOR_NODE];

					var existsInNew = false;

					// it's expensive without WeakMaps to check if unkeyed views' old view/model combo
					// exists in new tree, so they will be destroyed and dom re-used....unless domvm.viewScan = true
					if (createView.viewScan) {
						for (var j = 0; j < newBody.length; j++) {
							var n = newBody[j];
							if (!n.el && n.vm && n.vm.view[0] === o.vm.view[0] && n.vm.view[1] === o.vm.view[1]) {
								existsInNew = true;
								break;
								// TODO: should be able to push-graft new one here, to avoid
								// o.vm.moveTo(newParent, j, rendArgsNew);
								// buildNode(newBody[j]);
							}
						}
					}

					// removed keyed view = can reuse its DOM if by end of list, no exacts were found
					if (!existsInNew && !approx && newMap && !isVal(newMap[o.key]))
						approx = [i, DONOR_DOM];
				}
			}
			else if (areSimilar(o, node))
				// matching dom nodes without keys
				if (o.key === null || (!newMap || !isVal(newMap[o.key])))
					return [i, DONOR_DOM];
		}

		return approx;
	}

	function areSimilar(o, n) {
		return n.type === o.type && (n.type === TYPE_TEXT || n.tag !== null && n.tag === o.tag);
	}

	function graftNode(o, n) {
		// move element over
		n.el = o.el;
		o.el = null;

		if (n.type === TYPE_TEXT && n.body !== o.body) {
			n.el.nodeValue = n.body;
			return;
		}

		patchProps(n, o);

		var nTxt = !isArr(n.body);
		var oTxt = !isArr(o.body);

		// []|text -> text
		if (nTxt && n.body !== o.body) {
			if (oTxt && n.el.firstChild)
				n.el.firstChild.nodeValue = n.body;
			else
				n.el.textContent = n.body;
		}
		// text -> []
		else if (oTxt && !nTxt)
			n.el.textContent = "";
	}

	function parseTag(rawTag) {
		if (rawTag in seenTags)
			return seenTags[rawTag];

		var tagObj = {
			tag: null,
			id: null,
			class: null,
		};

		// must be in this order: tag#id.class1.class2
		var tagRe = /^([\w\-]+)?(?:#([\w\-]+))?((?:\.[\w\-]+)+)?$/;
		tagObj.tag = rawTag.replace(tagRe, function(full, tag, id, classes) {
			var props = {};

			if (id)
				tagObj.id = id;
			if (classes)
				tagObj.class = classes.replace(/\./g, " ").trim();

			return tag || "div";
		});

		seenTags[rawTag] = tagObj;

		return tagObj;
	}

	function procTag(rawTag, node) {
		// fast precheck for simple
		if (!/[.#]/.test(rawTag)) {
			node.tag = rawTag;
			return;
		}

		var tagObj = parseTag(rawTag);

		node.tag = tagObj.tag;

		if (tagObj.id || tagObj.class) {
			node.props = node.props || {};

			node.props.id = tagObj.id;
			node.props.class = tagObj.class;
		}
	}

	function procNode(raw, ownerVm) {
		var node = {
			type: null,		// elem, text, frag (todo)
			name: null,		// view name populated externally by createView
			key: null,		// view key populated externally by createView
			ref: null,
			idx: null,
			parent: null,
			tag: null,
//			svg: false,
//			math: false,
			ns: null,
			guard: false,	// created, updated, but children never touched
			props: null,
			on: null,
			el: null,
			keyMap: null,	// holds idxs of any keyed children
			body: null,
		};

		if (isArr(raw) && raw.length) {
			node.type = TYPE_ELEM;

			switch (raw.length) {
				case 2:
					if (isArr(raw[1]))
						node.body = raw[1];
					else if (isObj(raw[1]))
						node.props = raw[1];
					else
						node.body = raw[1];
					break;
				case 3:
					node.props = raw[1];
					node.body = raw[2];
					break;
			}

			procTag(raw[0], node);

			if (node.props)
				procProps(node.props, node, ownerVm);

			// isFunc(body)?
		}
		// plain strings/numbers
		else if (isVal(raw)) {
			node.type = TYPE_TEXT;
			node.body = raw;
		}
		/*
		// raw elements
		else if (isObj(raw) && raw.nodeType) {
			node.type = TYPE_ELEM;
			node.el = raw;
			node.tag = raw.nodeName;
		//  node.props?
		}
		*/

		return node;
	}

	function isEvProp(prop) {
		return prop.substr(0,2) === "on";
	}

	function procProps(props, node, ownerVm) {
		for (var i in props) {
			if (isEvProp(i))
				props[i] = isFunc(props[i]) ? ownerVm.wrapHandler(props[i]) : isArr(props[i]) ? ownerVm.wrapHandler(props[i][0], props[i][1]) : null;
			// getters
			else if (isFunc(props[i]))
				props[i] = props[i]();
		}

		if (isObj(props.style)) {
			for (var pname in props.style) {
				var val = props.style[pname];
				if (isFunc(val))
					props.style[pname] = val();
			}
		}

		node.key =
			isVal(props._key)	? props._key	:
			isVal(props._ref)	? props._ref	:
			isVal(props.id)		? props.id		:
			isVal(props.name)	? props.name	: null;

		if (props._ref)
			node.ref = props._ref;
		if (props._name)
			node.name = props._name;
		if (props._guard)
			node.guard = props._guard;

		props._ref =
		props._key =
		props._name =
		props._guard = null;
	}

	function patchProps(n, o) {
		var init = !o;

		o = o || {};

		if (o.props || n.props) {
			var op = o.props || {};
			var np = n.props || {};

			var os = op.style;
			var ns = np.style;

			if (isObj(os) || isObj(ns)) {
				patch(n.el, os || {}, ns || {}, setCss, delCss, n.ns, init);
				op.style = np.style = null;
			}

			// alter attributes
			patch(n.el, op, np, setAttr, delAttr, n.ns, init);

			if (ns)
				np.style = ns;
		}
	}

	// op = old props, np = new props, set = setter, del = unsetter
	function patch(targ, op, np, set, del, ns, init) {
		for (var name in np) {
			if (np[name] === null) continue;

			// add new or mutate existing not matching old
			// also handles diffing of wrapped event handlers via exposed original (_fn)
			if (!(name in op) || (isEvProp(name) ? np[name]._fn !== op[name]._fn : np[name] !== op[name]))
				set(targ, name, np[name], ns, init);
		}
		// remove any removed
		for (var name in op) {
			if (op[name] === null) continue;

			if (!(name in np))
				del(targ, name, ns, init);
		}
	}

//  function setEvt(targ, name, val) {targ.addEventListener(name, val, false);};	// tofix: if old node exists (grafting), then don't re-add
//  function delEvt(targ, name, val) {targ.removeEventListener(name, val, false);};

	function setData(targ, name, val, ns, init) {targ.dataset[name] = val;};
	function delData(targ, name, ns, init) {targ.dataset[name] = "";};

	function setCss(targ, name, val) {targ.style[name] = val;};
	function delCss(targ, name) {targ.style[name] = "";};

	function setAttr(targ, name, val, ns, init) {
		if (name[0] === ".") {
			var n = name.substr(1);
			if (ns === "svg")
				targ[n].baseVal = val;
			else
				targ[n] = val;
		}
		else if (name === "class")
			targ.className = val;	  // svg is setattrns?
		else if (name === "id" || isEvProp(name))
			targ[name] = val;	  // else test delegation for val === function vs object
		else if (val === false)
			delAttr(targ, name, ns, init);
		else {
			if (val === true)
				val = "";
			ns ? targ.setAttributeNS(null, name, val) : targ.setAttribute(name, val);
		}
	}

	function delAttr(targ, name, ns, init) {
		if (init) return;

		if (name[0] === ".") {
			var n = name.substr(1);
			if (ns === "svg")
				targ[n].baseVal = null;
			else
				targ[n] = null;					// or = ""?
		}
		else if (name === "class")
			targ.className = "";				// svg is setattrns?
		else if (name === "id" || isEvProp(name))
			targ[name] = null;
		else
			ns ? targ.removeAttributeNS(null, name) : targ.removeAttribute(name);
	}

	function collectRefs(node, parentVm) {
		var refs = (node.vm || parentVm).refs;

		if (node.ref !== null && node.el)
			refs[node.ref] = node.el;
		if (isArr(node.body)) {
			node.body.forEach(function(n) {
				collectRefs(n, node.vm || parentVm);
			});
		}
	}

	function collectHtml(node) {
		var html = "";
		switch (node.type) {
			case TYPE_ELEM:
				html += "<" + node.tag;

				if (node.props) {
					var style = isVal(node.props.style) ? node.props.style : "";
					var css = isObj(node.props.style) ? node.props.style : null;

					if (css) {
						for (var pname in css) {
							if (css[pname] !== null)
								style += camelDash(pname) + ": " + css[pname] + ';';
						}
					}

					for (var pname in node.props) {
						if (isEvProp(pname))
							continue;

						var val = node.props[pname];

						if (isFunc(val))
							val = val();

						if (isObj(val))
							continue;

						if (val === true)
							html += " " + pname;
						else if (val === false) {}
						else if (val !== null && pname[0] !== ".")
							html += " " + pname + '="' + val + '"';
					}

					if (style.length)
						html += ' style="' + style + '"';
				}

				// if body-less svg node, auto-close & return
				if (node.ns && node.tag !== "svg" && node.tag !== "math" && !node.body)
					return html + "/>";
				else
					html += ">";
				break;
			case TYPE_TEXT:
				return node.body;
				break;
		}

		if (!voidTags.test(node.tag)) {
			if (isArr(node.body)) {
				node.body.forEach(function(n2) {
					html += collectHtml(n2);
				});
			}
			else
				html += node.body || "";

			html += "</" + node.tag + ">";
		}

		return html;
	}

	function isArr(val) {
		return Array.isArray(val);
	}

	function isVal(val) {
		var t = typeof val;
		return t === "string" || t === "number" && !isNaN(val) && val !== Infinity;
	}

	function isObj(val) {
		return Object.prototype.toString.call(val) === "[object Object]";
	}

	function isFunc(val) {
		return typeof val === "function";
	}

	function camelDash(val) {
		return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}

	// saves from having to do fn && fn()
	function exec(fn, args) {
		if (fn)
			return fn.apply(null, args);
	}

	function insertArr(targ, arr, pos, rem) {
		targ.splice.apply(targ, [pos, rem].concat(arr));
	}

	// https://github.com/darsain/raft
	// rAF throttler, aggregates multiple repeated redraw calls within single animframe
	function raft(fn) {
		if (!win.requestAnimationFrame)
			return fn;

		var id, ctx, args;

		function call() {
			id = 0;
			fn.apply(ctx, args);
		}

		return function() {
			ctx = this;
			args = arguments;
			if (!id) id = win.requestAnimationFrame(call);
		};
	}
});