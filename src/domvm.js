/**
* Copyright (c) 2015, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* domvm.js - DOM ViewModel
* A thin, fast, dependency-free vdom diffing lib
* https://github.com/leeoniya/domvm
*
* API heavily inspired by https://github.com/creationix/domchanger
*/

( // Module boilerplate to support commonjs, browser globals and AMD.
	(typeof module === "object" && typeof module.exports === "object" && function (m) { module.exports = m(); }) ||
	(typeof define === "function" && function (m) { define("domvm", m); }) ||
	(function (m) { window.domvm = m(); })
)(function () {
	"use strict";

	var svgNs = "http://www.w3.org/2000/svg";
	var voidTags = /^(?:img|br|input|col|link|meta|area|base|command|embed|hr|keygen|param|source|track|wbr)$/;
	var seenTags = {};  // memoized parsed tags, todo: clean this?

	var win = typeof window == "undefined" ? {} : window;
	var doc = document;

	var TYPE_ELEM = 1;
	var TYPE_TEXT = 2;
//  var TYPE_RAWEL = 3;
	var TYPE_FRAG = 4;

	create.useRaf = true;

	return create;

// ----------------------------
	function isArray(v) {
		return Array.isArray(v);
	}

	function isValue(v) {
		var type = typeof v;
		return type == "string" || type == "number";
	}

	function isObj(v) {
		return v !== null && typeof v == "object";
	}

	function isFunc(v) {
		return typeof v == "function";
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

	function collectRefs(node, refs, init) {
		var isComp = node.name !== null;

		if (!init && isComp)
			return null;

		refs = refs || {};
		if (node.ref !== null && node.el)
			refs[node.ref] = node.el;
		if (isArray(node.body)) {
			node.body.forEach(function(n) {
				collectRefs(n, refs);
			});
		}

		return refs;
	}

	function camelDash(val) {
		return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}

	function collectHtml(node) {
		var html = "";
		switch (node.type) {
			case TYPE_ELEM:
				html += "<" + node.tag;

				if (node.props) {
					var style = isValue(node.props.style) ? node.props.style : "";
					var css = isObj(node.props.style) ? node.props.style : null;

					if (css) {
						for (var pname in css) {
							if (css[pname] !== null)
								style += camelDash(pname) + ": " + css[pname] + ';';
						}
					}

					for (var pname in node.props) {
						if (pname.indexOf("on") === 0)
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
				if (node.svg && node.tag !== "svg" && !node.body)
					return html + "/>";
				else
					html += ">";
				break;
			case TYPE_TEXT:
				return node.body;
				break;
		}

		if (!voidTags.test(node.tag)) {
			if (isArray(node.body)) {
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

	function create(viewFn, rendArgs, parentView) {
		if (isArray(viewFn))
			viewFn = createAnonView(viewFn);

		return createView.call(null, viewFn, rendArgs, parentView);
	}

	// wraps a branchDef in an anon view
	function createAnonView(branchDef) {
		return function AnonView(redraw, refs, emit) {
			return {
				render: function() {
					return branchDef;
				}
			}
		}
	}

	function createView(viewFn, rendArgs, parentView) {
		var refs = {};
		var emit = emit;

		// creates a curried emit
		emit.event = function() {
			var args = arguments;
			return function() {
				emit.apply(null, args);
			};
		};

		// targeted by depth or by key, root = 1000
		emit.redraw = function(targ) {
			targ = targ || 1000;

			return function() {
				emit("_redraw:" + targ);
			};
		};

		var rAFresh = create.useRaf ? raft(redraw) : redraw;	// rAF-debounced redraw
		var view = viewFn(rAFresh, refs, emit);
		var render = view.render;
//	  var cleanup = view.cleanup || noop;
		var after = view.after;
		var branch = null;

		redraw();

		return getInst();

		function getInst() {
			return {
				html: html,
				branch: branch,
				redraw: rAFresh,
				mount: mount,
				attach: attachDOM,
			//  emit
			//  refs
			//  destroy: destroy,
			};
		}

		function attachDOM(el) {
			hydrateWith(branch, el);
			return getInst();
		}

		function html() {
			return collectHtml(branch);
		}

		function mount(el) {
			hydrateBranch(branch);
			el.appendChild(branch.el);
			return getInst();
		}
/*
		function destroy() {
			branch.el.parent.removeChild(branch.el);
			branch = null;
			// todo: other cleanup stuff
			cleanup();
		}
*/
		function emit(event) {
			var depth = null;

			var evd = event.split(":");  // TODO: by key and by ref also

			if (evd.length == 2) {
				event =  evd[0];
				depth = +evd[1];
			}

			var args = Array.prototype.slice.call(arguments, 1);

			var targ = branch;

			if (depth !== null) {
				while (--depth && targ.parent)		// && ?
					targ = targ.parent;

				targ.onEmit[event].apply(null, args);
			}
			else {
				while (targ) {
					if (targ.onEmit && event in targ.onEmit) {
						var res = targ.onEmit[event].apply(null, args);
						if (res === false) break;
					}
					targ = targ.parent;
				}
			}
		}

		function redraw() {
			var args = arguments.length == 0 ? rendArgs || [] : arguments;
			var branchDef = render.apply(null, args);

			var newBranch = buildBranch(branchDef, true, parentView || null);

			newBranch.name = newBranch.name || viewFn.name || null;

			newBranch.onEmit = view.on || {};

			newBranch.onEmit._redraw = redraw;

			if (branch && similarNodes(branch, newBranch))
				graftBranch(branch, newBranch, true);

			// update parent's view of self
			// this could be expensive is hundreds of sub-components redraw quickly
			// could be avoided if a top-level redraw/sync was agreed to stay manual
			if (parentView) {
				var selfIdx = parentView.body.indexOf(branch);
				parentView.body[selfIdx] = newBranch;
			}

			branch = newBranch;

			// necessary to allow repaint to happen so refs are 'live'
			// use requestAnimationFrame here instead?
			setTimeout(function() {
				collectRefs(branch, refs, true);
				after && after();
			}, 0);

			return getInst();
		}
	}

	function buildBranch(raw, isView, parentView, svg) {
		// viewFns
		if (isFunc(raw))
			return createView(raw, null, parentView).branch;
		// viewFns with params
		else if (isArray(raw) && isFunc(raw[0]))
			return createView(raw[0], raw.slice(1), parentView).branch;

		var node = procNode(raw, svg);

		svg = svg || node.svg;

		if (isView) {
			node.parent = parentView || null;
			parentView = node;
		}

		if (isArray(node.body)) {
			var keyMap = {},
				anyKeys = false;

			node.body = node.body.map(function(raw, i) {
				var node2 = buildBranch(raw, false, parentView, svg);
				if (node2.key !== null) {
					keyMap[node2.key] = i;
					anyKeys = true;
				}
				return node2;
			});

			if (anyKeys)
				node.keyMap = keyMap;
		}

		return node;
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

	function procNode(raw, svg) {
		var node = {
			type: null,   // elem, text, frag (todo)
			name: null,   // view name populated externally by createView
			key: null,	// view key populated externally by createView
			ref: null,
			tag: null,
			svg: false,
			guard: false,	// created, updated, but children never touched
			dataset: null,  // TODO
			props: null,
			on: null,
			onEmit: null,
			el: null,
			keyMap: null,	// holds idxs of any keyed children
			body: null,
		};

		if (isArray(raw) && raw.length) {
			node.type = TYPE_ELEM;

			switch (raw.length) {
				case 2:
					if (isArray(raw[1]))
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
				procProps(node.props, node);

			// isFunc(body)?

			// todo: make uniform, but still avoid createTextNode? if (node.body.length == 1 && isValue(node.body[0]))  node.el.textContent = 1, node.body = [newnode, inject firstChild]
		//  if (isValue(node.body))
		//	  node.body = [node.body];

			node.svg = svg || node.tag == "svg";
		}
		// plain strings/numbers
		else if (isValue(raw)) {
			node.type = TYPE_TEXT;
			node.body = raw;
		}
		// raw elements
		else if (isObj(raw) && raw.nodeType) {
			node.type = TYPE_ELEM;
			node.el = raw;
			node.tag = raw.nodeName;
		//  node.props?
		}

		return node;
	}

	function procProps(props, node) {
		// getters
		for (var i in props) {
			if (isFunc(props[i]) && i.indexOf("on") == -1)
				props[i] = props[i]();
		}

		if (isObj(props.style)) {
			for (var pname in props.style) {
				var val = props.style[pname];
				if (isFunc(val))
					props.style[pname] = val();
			}
		}

		// prefixed attr (expensive to parse/convert)
		// "on*","data-"

		// helper collections
	//  if (props.on)
	//	node.on = props.on;
	//  if (props.data)
	//	node.dataset = props.data;

		// special properties
		if (props._ref)
			node.ref = props._ref;
		if (props._key)
			node.key = props._key;
		if (props._name)
			node.name = props._name;
		if (props._guard)
			node.guard = props._guard;

	//  props.on =
		props.data =

		props._ref =
		props._key =
		props._name =
		props._guard = null;
	}

	function hydrateBranch(node) {
		if (node.type == TYPE_ELEM) {
			if (!node.el) {
				node.el = node.svg ? doc.createElementNS(svgNs, node.tag) : doc.createElement(node.tag);
				// if "svg", xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  //version="1.1"
			//  node.el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
				node.props && patchProps(node);
			}

			if (isArray(node.body)) {
			//  btw, createDocumentFragment is more expensive here
				node.body.forEach(function(n2) {
					hydrateBranch(n2);
					node.el.appendChild(n2.el);
				});
			}
			// for body defs like ["a", "blaahhh"], entire body can be dumped at once
			else if (isValue(node.body))
				node.el.textContent = node.body;
		}
		// for body defs like ["foo", ["a"], "bar"], create separate textnodes
		else if (node.type == TYPE_TEXT)
			node.el = doc.createTextNode(node.body);
	}

	// absorbs active dom, assumes it was built by dumping the html()
	// of this node into innerHTML (isomorphically)
	// (todo: bind/refs)
	function hydrateWith(node, el) {
		node.el = el;
		var kids = el.children;

		if (isArray(node.body)) {
			for (var i = 0; i < node.body.length; i++)
				hydrateWith(node.body[i], kids[i]);  // does the closure's version of returned branch update?
		}
	}

	function similarNodes(o, n) {
		return (n.key !== null && n.key === o.key) || (n.type === o.type && (n.type === TYPE_TEXT || n.tag !== null && n.tag === o.tag || n.name !== null && n.name === o.name));
	}

	// accepts parents' keymaps
	function findDonor(newNode, oldBody, oldKeymap, newKeymap, fromIdx, toIdx) {
		// if keyed and exists in old body
		if (newNode.key !== null && oldKeymap && newNode.key in oldKeymap) {
			var oldIdx = oldKeymap[newNode.key];
			return oldBody[oldIdx];
		}

		fromIdx = fromIdx || 0;

		if (fromIdx > oldBody.length - 1)
			return null;

		toIdx = toIdx === 0 ? 0 : toIdx || oldBody.length - 1;

		// else search for similar & not keyed in newKeymap
		for (var i = fromIdx; i <= toIdx; i++) {
			var oldNode = oldBody[i];
			if (!oldNode.el)		// skip already grafted
				continue;
			if (similarNodes(oldNode, newNode)) {
				if (oldNode.key === null || !newKeymap || (newKeymap && !(oldNode.key in newKeymap)))
					return oldNode;
			}
		}

		return null;
	}

	// transplant nodes and from old to new re-use
	function graftBranch(o, n) {
		graftMatchedNode(o, n);

		// if both old and new have non-empty array bodies, attempt graft old->new, else hydrate new
		if (isArray(n.body) && n.body.length) {
			if (isArray(o.body) && o.body.length) {
				var oldLast = o.body.length - 1;
				for (var i = 0, j = 0; i < n.body.length; i++) {
					var n2 = n.body[i];

					// without keys, this may be expensive if body is 1000s of nodes, benefits of node
					// reuse may not jusify re-iterating full old body to find reusable and ungrafted nodes
					// fromIdx/toIdx may be passed in to only iterate roughly (or exactly) parallel nodes
					var o2 = findDonor(n2, o.body, o.keyMap, n.keyMap, j);  // , i, i

					if (o2) {
						graftBranch(o2, n2);
						j++;
					}
					else {
						hydrateBranch(n2);

						if (i >= oldLast)
							n.el.appendChild(n2.el);
						else
							n.el.insertBefore(n2.el, n.el.childNodes[i]);
					}
				}
			}
			// nothing to graft, hydrate new nodes
			else
				hydrateBranch(n);	  // todo: test, bad?
		}

		if (isArray(o.body)) {
			// clean old body that's left (that wasnt grafted)
			o.body.forEach(function(node) {
				if (node.el) {
					if (node.el.parentNode)
						node.el.parentNode.removeChild(node.el);	// set to null?
					node.el = null;
				}
				// other cleanup here?, todo: look for any mem leaks, clean seenTags?
			});

			o.body = null;
		}

		if (isArray(n.body)) {
			// re-sort as needed
			var kids = n.el.childNodes;
			n.body.forEach(function(n2, i) {
				if (kids[i] !== n2.el)
					n.el.insertBefore(n2.el, kids[i]);
			});
		}
	}

	function graftMatchedNode(o, n) {
		// move element over
		n.el = o.el;
		o.el = null;

		if (n.type === TYPE_TEXT && n.body !== o.body) {
			n.el.nodeValue = n.body;
			return;
		}

		patchProps(n, o);

		var nTxt = !isArray(n.body);
		var oTxt = !isArray(o.body);
		// []|text -> text
		if (nTxt && n.body !== o.body) {
			if (oTxt && n.el.firstChild)
				n.el.firstChild.nodeValue = n.body;
			else
				n.el.textContent = n.body;
		}
		// text -> []
		else if (oTxt && !nTxt) {
			while (n.el.firstChild) {
				n.el.removeChild(n.el.firstChild);
			}
		}
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
				patch(n.el, os || {}, ns || {}, setCss, delCss, n.svg, init);
				op.style = np.style = null;
			}

			// alter attributes
			patch(n.el, op, np, setAttr, delAttr, n.svg, init);

			if (ns)
				np.style = ns;
		}

		// todo: parse data-* attr (slow)	indexOf("data-") == 0
//	  if (o.dataset || n.dataset)
//		  patch(n.el, o.dataset || {}, n.dataset || {}, setData, delData, n.svg, init);

		// todo? parse on* handlers (slow)  indexOf("on") == 0
//	  if (o.on || n.on)
//		  patch(n.el, o.on || {}, n.on || {}, setEvt, delEvt, n.svg, init);
	}

	// op = old props, np = new props, set = setter, del = unsetter
	function patch(targ, op, np, set, del, svg, init) {
		svg = svg || false;

		for (var name in np) {
			if (np[name] === null) continue;

			// add new or mutate existing not matching old
			if (!(name in op) || np[name] !== op[name])
				set(targ, name, np[name], svg, init);
		}
		// remove any removed
		for (var name in op) {
			if (op[name] === null) continue;

			if (!(name in np))
				del(targ, name, svg, init);
		}
	}

//  function setEvt(targ, name, val) {targ.addEventListener(name, val, false);};	// tofix: if old node exists (grafting), then don't re-add
//  function delEvt(targ, name, val) {targ.removeEventListener(name, val, false);};

	function setData(targ, name, val, svg, init) {targ.dataset[name] = val;};
	function delData(targ, name, svg, init) {targ.dataset[name] = "";};

	function setCss(targ, name, val) {targ.style[name] = val;};
	function delCss(targ, name) {targ.style[name] = "";};

	function setAttr(targ, name, val, svg, init) {
		if (name[0] === ".")
			targ[name.substr(1)] = val;
		else if (name === "class")
			targ.className = val;	  // svg is setattrns?
		else if (name === "id" || name.indexOf("on") === 0)
			targ[name] = val;	  // else test delegation for val === function vs object
		else if (val === false)
			delAttr(targ, name, svg, init);
		else {
			if (val === true)
				val = "";
			svg ? targ.setAttributeNS(null, name, val) : targ.setAttribute(name, val);
		}
	}

	function delAttr(targ, name, svg, init) {
		if (init) return;

		if (name[0] === ".")
			targ[name.substr(1)] = null;		// or = ""?
		else if (name === "class")
			targ.className = "";				// svg is setattrns?
		else if (name.indexOf("on") === 0)
			targ[name] = null;
		else
			svg ? targ.removeAttributeNS(null, name) : targ.removeAttribute(name);
	}
});