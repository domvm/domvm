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
	var seenTags = {};		// memoized parsed tags, todo: clean this?

	var TYPE_ELEM = 1;
	var TYPE_TEXT = 2;
//	var TYPE_RAWEL = 3;
	var TYPE_FRAG = 4;

	createView.BENCH = false;

	return createView;

// ----------------------------

	function noop() {}

	function isArray(v) {
		return Array.isArray(v);
	}

	function isPlain(v) {
		var type = typeof v;
		return type == "string" || type == "number";
	}

	function isObj(v) {
		return typeof v == "object";
	}

	function isFunc(v) {
		return typeof v == "function";
	}

	// https://github.com/darsain/raft
	// rAF throttler, aggregates multiple repeated refresh calls within single animframe
	function raft(fn) {
		if (!window.requestAnimationFrame)
			return fn;

		var id, ctx, args;

		function call() {
			id = 0;
			fn.apply(ctx, args);
		}

		return function () {
			ctx = this;
			args = arguments;
			if (!id) id = requestAnimationFrame(call);
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

	function collectHtml(node) {
		var html = "";
		switch (node.type) {
			case TYPE_ELEM:
				html += "<" + node.tag;

				if (node.props) {
					for (var pname in node.props) {
						if (node.props[pname] !== null && (pname == "value" || node.props[pname] !== ""))	// TODO: checked vs checked=""
							html += " " + pname + '="' + node.props[pname] + '"';
					}
				}

				if (node.style) {
					var style = "";
					for (var pname in node.style) {
						if (node.style[pname] !== null)
							style += pname + ": " + node.style[pname] + ';';
					}

					html += ' style="' + style + '"';
				}

				// if body-less svg node, auto-close & return
				if (node.svg && !node.body)
					return html + "/>";
				else
					html +=  ">";
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

	// pass args?
	function createView(viewFn, rendArgs, parentView) {
		var refs = {};
		var emit = emit;
		var rAFresh = createView.BENCH ? refresh : raft(refresh);		// rAF-debounced refresh, except for bench
		var view = viewFn(rAFresh, refs, emit);
		var render = view.render;
//		var cleanup = view.cleanup || noop;
		var after = view.after || noop;
		var branch = null;

		refresh();

		return getInst();

		function getInst() {
			return {
				html: html,
				branch: branch,
				refresh: rAFresh,
				mount: mount,
				import: importDOM,
			//	destroy: destroy,
			};
		}

		function importDOM(el) {
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
			var parent = parentView;
			while (parent) {
				if (parent.onEmit && event in parent.onEmit) {
					var args = Array.prototype.slice.call(arguments, 1);
					var res = parent.onEmit[event].apply(null, args);
					if (res === false) break;
				}
				parent = parentView.parent;
			}
		}

		function refresh() {
			var args = arguments.length == 0 ? rendArgs || [] : arguments;
			var branchDef = render.apply(null, args);
			var newBranch = buildBranch(branchDef, true, parentView || null);

			newBranch.name = viewFn.name || view.name || null;

			if (newBranch.key === null) {
				newBranch.key = "key" in branchDef ? branchDef.key :			// [Moo, arg1...].key
								"key" in view ? view.key :						// return {key: abc, render: ...}
								newBranch.key ||								// ["ul", {key: abc}] (reserved prop)
								newBranch.ref || null;							// ["ul$ref"]			// or also reuse "#id"?
			}

			if (view.on)
				newBranch.onEmit = view.on;

			if (branch)
				graftBranch(branch, newBranch, true);

			// update parent's view of self
			// this could be expensive is hundreds of sub-components refresh quickly
			// could be avoided if a top-level refresh/sync was agreed to stay manual
			if (parentView) {
				var selfIdx = parentView.body.indexOf(branch);
				parentView.body[selfIdx] = newBranch;
			}

			branch = newBranch;

			// necessary to allow repaint to happen so refs are 'live'
			// use requestAnimationFrame here instead?
			setTimeout(function() {
				collectRefs(branch, refs, true);
				after();
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
			ref: null,
			guard: null,
			classes: null,
		};

		// must be in this order: tag#id.class1.class2$ref, or !ref (guard)
		var tagRe = /^([\w-]+)?(?:#([\w-]+))?((?:\.[\w-]+)+)?(?:([\$!])([\w-]+))?/;
		tagObj.tag = rawTag.replace(tagRe, function(full, tag, id, classes, refType, ref) {
			var props = {};

			if (id)
				tagObj.id = id;
			if (classes)
				tagObj.classes = classes.replace(/\./g, " ").trim();
			if (ref) {
				tagObj.ref = ref;
				if (refType == "!")
					tagObj.guard = true;
			}

			return tag || "div";
		});

		// NOTE: when ref/guard is used as a key, seenTags will fill up
		// may not benefit from being memoized,
		seenTags[rawTag] = tagObj;

		return tagObj;
	}

	function procTag(rawTag, node) {
		// fast precheck for simple
		if (!/[.#$!]/.test(rawTag)) {
			node.tag = rawTag;
			return;
		}

		var tagObj = parseTag(rawTag);

		node.tag = tagObj.tag;
		node.ref = tagObj.ref;
		node.guard = tagObj.guard;

		if (tagObj.id || tagObj.classes) {
			node.props = node.props || {};

			node.props.id = tagObj.id;
			node.props.class = tagObj.classes;
		}
	}

	function procNode(raw, svg) {
		var node = {
			type: null,			// elem, text, frag (todo)
			name: null,			// view name populated externally by createView
			key: null,			// view key populated externally by createView
			ref: null,
			tag: null,
			svg: false,
			guard: false,		// created, updated, but children never touched
			dataset: null,		// TODO
			style: null,
			props: null,
			on: null,
			onEmit: null,
			el: null,
			keyMap: null,		// holds idxs of any keyed children
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

			node.svg = svg || node.tag == "svg";
		}
		// plain strings/numbers
		else if (isPlain(raw)) {
			node.type = TYPE_TEXT;
			node.body = raw;
		}
		// raw elements
		else if (isObj(raw) && raw.nodeType) {
			node.type = TYPE_ELEM;
			node.el = raw;
			node.tag = raw.nodeName;
		//	node.props?
		}

		return node;
	}

	function procProps(props, node) {
		// standard attr
		if (isObj(props.style)) {
			var style = "";
			for (var i in props.style)
				style += i + ":" + props.style[i] + ";";
			props.style = style;
		}

		// prefixed attr (expensive to parse/convert)
		// "on*","data-"

		// helper collections
		if (props.on)
			node.on = props.on;
		if (props.data)
			node.dataset = props.data;

		// special properties
		if (props._ref)
			node.ref = props._ref;
		if (props._key)
			node.key = props._key;
		if (props._name)
			node.name = props._name;

		props.on =
		props.data =

		props._ref =
		props._key =
		props._name = null;

		// "value", "checked" "disabled" "required"
	}

	function hydrateBranch(node) {
		if (node.type == TYPE_ELEM) {
			if (!node.el) {
				node.el = node.svg ? document.createElementNS(svgNs, node.tag) : document.createElement(node.tag);
				// if "svg", xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"
				node.props && patchProps(node);
			}

			if (isArray(node.body)) {
			//	btw, createDocumentFragment is more expensive here
				node.body.forEach(function(n2) {
					hydrateBranch(n2);
					node.el.appendChild(n2.el);
				});
			}
			// for body defs like ["a", "blaahhh"], entire body can be dumped at once
			else if (isPlain(node.body))
				node.el.textContent = node.body;
		}
		// for body defs like ["foo", ["a"], "bar"], create separate textnodes
		else if (node.type == TYPE_TEXT)
			node.el = document.createTextNode(node.body);
	}

	// absorbs active dom, assumes it was built by dumping the html()
	// of this node into innerHTML (isomorphically)
	// (todo: bind/refs)
	function hydrateWith(node, el) {
		node.el = el;
		var kids = el.children;

		if (isArray(node.body)) {
			for (var i = 0; i < node.body.length; i++)
				hydrateWith(node.body[i], kids[i]);		// does the closure's version of returned branch update?
		}
	}

	function similarNodes(o, n) {
		return (n.key !== null && n.key === o.key) || (n.type === o.type && (n.tag !== null && n.tag === o.tag || n.name !== null && n.name === o.name));
	}

	// accepts parents' keymaps
	function findDonor(newNode, oldBody, oldKeymap, newKeymap, fromIdx, toIdx) {
		// if keyed and exists in old body
		if (newNode.key !== null && oldKeymap && newNode.key in oldKeymap) {
			var oldIdx = oldKeymap[newNode.key];
			return oldBody[oldIdx];
		}

		fromIdx = fromIdx || 0;
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
	function graftBranch(o, n, simCheck) {
		if (simCheck && !similarNodes(o, n))
			throw "Cannot reuse dissimilar nodes";

		graftMatchedNode(o, n);

		// if both old and new have non-empty array bodies, attempt graft old->new, else hydrate new
		if (isArray(n.body) && n.body.length) {
			if (isArray(o.body) && o.body.length) {
				for (var i = 0; i < n.body.length; i++) {
					var n2 = n.body[i];

					// without keys, this may be expensive if body is 1000s of nodes, benefits of node
					// reuse may not jusify re-iterating full old body to find reusable and ungrafted nodes
					// fromIdx/toIdx may be passed in to only iterate roughly (or exactly) parallel nodes
					var o2 = findDonor(n2, o.body, o.keyMap, n.keyMap);		// , i, i

					if (o2)
						graftBranch(o2, n2);
					else
						hydrateBranch(n2);
				}
			}
			// nothing to graft, hydrate new nodes
			else
				hydrateBranch(n);
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

			o.body = "";
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

		patchProps(n, o);

		var nTxt = !isArray(n.body);
		var oTxt = !isArray(o.body);
		// []|text -> text
		if (nTxt && n.body !== o.body)
			n.el.textContent = n.body;
		// text -> []
		else if (oTxt && !nTxt) {
			while (n.el.firstChild) {
				n.el.removeChild(n.el.firstChild);
			}
		}
	}

	function patchProps(n, o) {
		o = o || {};

		if (o.props || n.props) {
			var op = o.props || {};
			var np = n.props || {};

			// alter attributes
			if (n.svg)
				patch(n.el, op, np, setAttrNS, delAttrNS);
			else
				patch(n.el, op, np, setAttr, delAttr);
		}

		// todo: parse data-* attr (slow)		indexOf("data-") == 0
		if (o.dataset || n.dataset)
			patch(n.el, o.dataset || {}, n.dataset || {}, setData, delData);

		// todo? parse on* handlers (slow)		indexOf("on") == 0
		if (o.on || n.on)
			patch(n.el, o.on || {}, n.on || {}, setEvt, delEvt);
	}

	// op = old props, np = new props, set = setter, del = unsetter
	function patch(targ, op, np, set, del) {
		for (var name in np) {
			if (np[name] === null) continue;

			// add new or mutate existing not matching old
			if (!(name in op) || np[name] !== op[name])
				set(targ, name, np[name]);
		}
		// remove any removed
		for (var name in op) {
			if (op[name] === null) continue;

			if (!(name in np))
				del(targ, name, op[name]);
		}
	}

//	function setEvt(targ, name, val) {targ.addEventListener(name, val, false);};	// tofix: if old node exists (grafting), then don't re-add
//	function delEvt(targ, name, val) {targ.removeEventListener(name, val, false);};

	function setEvt(targ, name, val) {targ["on" + name] = val;};
	function delEvt(targ, name) {targ["on" + name] = "";};

	function setData(targ, name, val) {targ.dataset[name] = val;};
	function delData(targ, name) {targ.dataset[name] = "";};

//	function setCss(targ, name, val) {targ.style[name] = val;};
//	function delCss(targ, name) {targ.style[name] = "";};

	function setAttr(targ, name, val) {
		if (name[0] === ".")
			targ[name.substr(1)] = val;
		else if (val === "" && name !== "value")
			delAttr(targ, name)
		else
			targ.setAttribute(name, val);
	};
	function delAttr(targ, name) {
		if (name[0] === ".")
			targ[name.substr(1)] = null;		// or = ""?
		else
			targ.removeAttribute(name);
	};

	function setAttrNS(targ, name, val) {val === "" ? delAttrNS(targ, name) : targ.setAttributeNS(null, name, val);};
	function delAttrNS(targ, name) {targ.removeAttributeNS(null, name);};
});