/**
* Copyright (c) 2016, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.js - DOM ViewModel
* A thin, fast, dependency-free vdom view layer
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
	var doc = typeof document == "undefined" ? {} : document;;

	var TYPE_ELEM = 1;
	var TYPE_TEXT = 2;
//  var TYPE_RAWEL = 3;
//	var TYPE_FRAG = 4;

	var DONOR_DOM	= 1;
	var DONOR_NODE	= 2;

	var t = true;
	var unitlessProps = {
		animationIterationCount: t,
		boxFlex: t,
		boxFlexGroup: t,
		columnCount: t,
		counterIncrement: t,
		fillOpacity: t,
		flex: t,
		flexGrow: t,
		flexOrder: t,
		flexPositive: t,
		flexShrink: t,
		float: t,
		fontWeight: t,
		gridColumn: t,
		lineHeight: t,
		lineClamp: t,
		opacity: t,
		order: t,
		orphans: t,
		stopOpacity: t,
		strokeDashoffset: t,
		strokeOpacity: t,
		strokeWidth: t,
		tabSize: t,
		transform: t,
		transformOrigin: t,
		widows: t,
		zIndex: t,
		zoom: t,
	};

	var cfg = {
		useRaf: true,
		viewScan: false,	// enables aggressive unkeyed view reuse
		useDOM: false,

	};

	createView.config = function(newCfg) {
		cfg = newCfg;
	};

	return createView;

	// creates closure
	// TODO: need way to indicate detached vm vs parent-less root, to prevent un-needed initial redraw
	function createView(viewFn, model, _key, rendArgs, opts, parentNode, idxInParent) {
		var isRootNode = !parentNode;

		// for domvm([MyView, model, _key])
		if (isArr(viewFn)) {
			model = viewFn[1];
			_key = viewFn[2];
			rendArgs = viewFn[3];
			opts = viewFn[4];
			viewFn = viewFn[0];
		}

		var origModel = model || null;

		// special case model = ctx + model
		model = (model && model.ctx && model.model) ? model.model : origModel;

		var vm = {
			ctx: {},
			node: null,
			view: [viewFn, model, _key],
			render: null,
			on: function(ev, fn) {
				if (fn)
					vm.events[ev].push(fn);
				else {
					for (var i in ev)
						vm.events[i].push(ev[i]);
				}
			},
		//	off: function(ev, fn) {},
			events: {
			//	willCreate:	[],
			//	didCreate:	[],
				willRedraw:	[],
				didRedraw:	[],
				willDestroy:[],
				didDestroy:	[],
			},
			redraw: cfg.useRaf ? raft(redraw) : redraw,
			emit: emit,
			refs: {},
			html: function() {
				return collectHtml(vm.node);
			},
			keyMap: {},
			patch: function() {
				var targs = arguments;

				for (var i = 0; i < targs.length; i++) {
					var key = targs[i][1]._key,
						donor = vm.keyMap[key],
						parent = donor.parent,
						node = buildNode(initNode(targs[i], parent, donor.idx, vm), donor);

					parent.body[donor.idx] = parent.keyMap[key] = vm.keyMap[key] = node;
				}
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
		};

		vm.events._redraw = vm.redraw;
		vm.render = viewFn.call(vm.ctx, vm, origModel, _key);

		// targeted by depth or by key, root = 1000
		// todo: pass through args
		emit.redraw = function(targ) {
			targ = isVal(targ) ? targ : 1000;
			emit("_redraw:" + targ);
		};

		if (parentNode)
			return moveTo(parentNode, idxInParent, rendArgs);
		else
			return redraw(rendArgs);

		// transplants node into tree, optionally updating rendArgs
		function moveTo(parentNodeNew, idxInParentNew, rendArgsNew) {
			parentNode = parentNodeNew;
			updIdx(idxInParentNew);

			return redraw(rendArgsNew, false);
		}

		function updIdx(idxInParentNew) {
			idxInParent = idxInParentNew;
		}

		function redraw(rendArgsNew, isRedrawRoot) {
			execAll(vm.events.willRedraw);

			rendArgs = rendArgsNew || rendArgs;

			vm.refs = {};
			vm.keyMap = {};

			var old = vm.node;
			var def = vm.render.apply(model, rendArgs);
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
				collectRefs(vm);

				execAll(vm.events.didRedraw);
			}, 0);

			return vm;
		}

		function destroy(live) {
			execAll(vm.events.willDestroy);

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

			execAll(vm.events.didDestroy);
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

				var ons = targ.vm ? targ.vm.events : null;
				var evh = ons ? ons[event] : null;
				evh && evh.apply(null, args);
			}
			else {
				while (targ) {
					if (targ.vm) {
						var ons = targ.vm.events;
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
		//		var isEmptyTextNode = node2 && node2.type === TYPE_TEXT && node2.body === "";
		//		if (isEmptyTextNode)
		//			el.insertBefore(document.createTextNode(""), el.childNodes[i] || null);

				hydrateWith(node2, el.childNodes[i]);
			}
		}
	}

	function cleanNode(node, removeSelf) {
		if (isArr(node.body)) {
			node.body.forEach(function(n, i) {
				if (!n) return;

				if (n.vm && !n.moved)
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

		node.vm = null;

		if (removeSelf && node.el) {
			node.el.parentNode.removeChild(node.el);
			node.el = null;
		}
	}

	// builds out node, excluding views.
	// collects keyMap needed for grafting
	function initNode(def, parentNode, idxInParent, ownerVm) {
		var node = procNode(def, ownerVm);

		// store a ref to this node for later ref collection to avoid full tree walking
		if (node.ref !== null)
			ownerVm.refs[node.ref] = node;

		node.parent = parentNode;
		node.idx = idxInParent;
		node.ns = parentNode && parentNode.ns ? parentNode.ns : (node.tag === "svg" || node.tag === "math") ? node.tag : null;

		if (isArr(node.body)) {
			var keyMap = {}, anyKeys = false;

			for (var i = 0, len = node.body.length; i < len; i++) {
				var def2 = node.body[i];

				var key = null, node2 = null, killIt = false, mergeIt = false;

				// getters
				if (isFunc(def2))
					def2 = def2();

				// kill null and undefined nodes
				if (def2 == null)
					killIt = true;
				else {
					var def2IsArr = isArr(def2),
						def2IsObj = def2IsArr ? false : isObj(def2);		// technically, isPlainObj

					if (def2IsArr) {
						// kill empty array nodes
						if (!def2.length)
							killIt = true;
						// handle arrays of arrays, avoids need for concat() in tpls
						else if (isArr(def2[0]))
							mergeIt = true;
						else if (isFunc(def2[0]))	// decl sub-view
							key = def2[2];
						else {
							node2 = initNode(def2, node, i, ownerVm);
							key = node2.key;
						}
					}
					else if (def2IsObj) {
						if (isFunc(def2.redraw)) {	// pre-init vm
							def2.moveTo(node, i);
							node2 = def2.node;
							key = def2.view[2];
						}
						else {
							node.body[i--] = ""+def2;
							continue;
						}
					}
					else {
						if (def2 === "")
							killIt = true;
						// merge if adjacent text nodes
						else if (i > 0 && node.body[i-1].type === TYPE_TEXT) {		//  && isVal(def2)
							node.body[i-1].body += ""+def2;
							killIt = true;
						}
						else
							node2 = initNode(""+def2, node, i, ownerVm);
					}
				}

				if (killIt || mergeIt) {
					if (mergeIt)
						insertArr(node.body, def2, i, 1);
					else
						node.body.splice(i,1);

					len = node.body.length;
					i--; continue;	// avoids de-opt
				}

				if (isVal(key)) {
					keyMap[key] = i;
					ownerVm.keyMap[key] = node2;
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
				else
					node.body[i] = buildNode(kid);
			});
		}

		return node;
	}

	function hydrateNode(node) {
		var wasDry = !node.el;

		if (node.type == TYPE_ELEM) {
			if (wasDry) {
				node.el = node.ns ? doc.createElementNS(NS[node.ns], node.tag) : doc.createElement(node.tag);
				node.props && patchProps(node);
			}

			if (isArr(node.body))
				node.body.forEach(hydrateNode);

			// for body defs like ["a", "blaahhh"], entire body can be dumped at once
			else if (wasDry && isVal(node.body))
				node.el.textContent = node.body;
		}
		// for body defs like ["foo", ["a"], "bar"], create separate textnodes
		else if (node.type == TYPE_TEXT && wasDry)
			node.el = doc.createTextNode(node.body);

		// reverse-ref
		node.el._node = node;

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
					if (cfg.viewScan) {
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

		o.moved = true;
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
//			name: null,		// view name populated externally by createView
			key: null,		// view key populated externally by createView
			ref: null,
			idx: null,
			parent: null,
			moved: false,
			tag: null,
//			svg: false,
//			math: false,
			ns: null,
			guard: false,	// created, updated, but children never touched
			props: null,
//			on: null,
			el: null,
			keyMap: null,	// holds idxs of any keyed children
			body: null,
		};

		// getters
		if (isFunc(raw))
			raw = raw();

		if (isArr(raw) && raw.length) {
			node.type = TYPE_ELEM;

			if (raw.length > 1) {
				var bodyIdx = 1;

				if (isObj(raw[1])) {
					node.props = raw[1];
					bodyIdx = 2;
				}

				if (raw.length == bodyIdx + 1)
					node.body = isVal(raw[bodyIdx]) ? raw[bodyIdx] : isFunc(raw[bodyIdx]) ? raw[bodyIdx]() : raw.slice(bodyIdx);
				else
					node.body = raw.slice(bodyIdx);
			}

			procTag(raw[0], node);

			if (node.props)
				procProps(node.props, node, ownerVm);

			// promises
		//	else if (isProm(node.body))
		//		node.body = "";

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

	function wrapHandler(fns, ctx) {
		var handler = function(e) {
			var res;

			if (isFunc(fns))
				res = fns.call(ctx, e);
			else if (isObj(fns)) {
				for (var filt in fns) {
					if (e.target.matches(filt))
						res = fns[filt].call(ctx, e);
				}
			}

			if (res === false) {
				e.preventDefault();
				e.stopPropagation();		// yay or nay?
			}
		};

		return handler;
	}

	function procProps(props, node, ownerVm) {
		for (var i in props) {
			if (isEvProp(i))
				props[i] = wrapHandler(props[i], ownerVm.view[1] || null);
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
//		if (props._name)
//			node.name = props._name;
		if (props._guard)
			node.guard = props._guard;

		props._ref =
		props._key =
//		props._name =
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
			if (!(name in op) || np[name] !== op[name])
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

//	function setData(targ, name, val, ns, init) {targ.dataset[name] = val;};
//	function delData(targ, name, ns, init) {targ.dataset[name] = "";};

	function setCss(targ, name, val) {targ.style[name] = !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;}
	function delCss(targ, name) {targ.style[name] = "";}

	function setAttr(targ, name, val, ns, init) {
		if (name[0] === ".") {
			var n = name.substr(1);
			if (ns === "svg")
				targ[n].baseVal = val;
			else
				targ[n] = val;
		}
		else if (name === "class")
			targ.className = val;
		else if (name === "id" || isEvProp(name))
			targ[name] = val;	  // else test delegation for val === function vs object
		else if (val === false)
			delAttr(targ, name, ns, init);
		else {
			if (val === true)
				val = "";

			targ.setAttribute(name, val);
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
			targ.className = "";
		else if (name === "id" || isEvProp(name))
			targ[name] = null;
		else
			targ.removeAttribute(name);
	}

	function collectRefs(vm) {
		for (var i in vm.refs)
			vm.refs[i] = vm.refs[i].el;
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
		return val instanceof Array;
	}

	function isVal(val) {
		var t = typeof val;
		return t === "string" || t === "number";
	}

	function isObj(val) {
		return typeof val === "object" && val !== null && !isArr(val);
	}

	function isFunc(val) {
		return typeof val === "function";
	}

//	function isProm(val) {
//		typeof val === "object" && isFunc(val.then);
//	}

	function camelDash(val) {
		return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}

	// saves from having to do fn && fn()
	function execAll(fnArr, args) {
		fnArr.forEach(function(fn) {
			return fn.apply(null, args);
		});
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