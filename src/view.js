(function(domvm) {
	"use strict";

	var NS = {
		svg: "http://www.w3.org/2000/svg",
		math: "http://www.w3.org/1998/Math/MathML",
	};

	var doc = typeof document == "undefined" ? {} : document;

	var DONOR_DOM	= 1;
	var DONOR_NODE	= 2;

	var tagCache = {};

	// queue for did* hooks to ensure they all fire in same anim frame
	var didHooks = [];

	var pendRedraws = [];

	function drainDidHooks() {
		var item, queue, queues = [didHooks, pendRedraws];

		while (queue = queues.shift()) {
			while (item = queue.shift())
				item[0].apply(null, item.slice(1));
		}
	}

	var cfg = {
		useRaf: true,
	//	viewScan: false,	// enables aggressive unkeyed view Recycle
	//	useDOM: false,
	};

	domvm.view = createView;

	domvm.view.config = function(newCfg) {
		cfg = newCfg;
	};

	// for lib-assisted auto monkey patching
	var vmExts = null;

	domvm.view.extend = function(ext, reset) {
		vmExts = !vmExts || reset ? [] : vmExts;
		vmExts.push(ext);
	};

	var u = domvm.utils;

	return domvm;

	// disambiguates immutable handle from different param sigs
	function getViewKey(model, key) {
		return (
			// false key signals a non-persistent model
			key === false ? null :
			// undefined/null key signals a persistent model
			key == null && model != null ? model :
			// string or numeric key - persistent model tracked by key
			u.isVal(key) || u.isObj(key) || u.isArr(key) || u.isFunc(key) ? key :
			null
		);
	}

	// creates closure
	// TODO: need way to indicate detached vm vs parent-less root, to prevent un-needed initial redraw
	function createView(viewFn, model, key, opts, parentNode, idxInParent) {
		var isRootNode = !parentNode;

		// for domvm([MyView, model, key])
		if (u.isArr(viewFn)) {
			model	= viewFn[1];
			key		= viewFn[2];
			opts	= viewFn[3];
			viewFn	= viewFn[0];
		}

		key = getViewKey(model, key);

		var vm = {
			api: {},
			node: null,
			view: [viewFn, key],	// immutable vm handle
			model: model,
			opts: opts || {},
			render: null,
			update: function(newModel, doRedraw) {
				// persistent models cannot be updated with new data via the view
				// this function is for dumb data re-rendering, key must have been false
				if (newModel != null && (key !== model || u.isVal(key)))
					model = vm.model = newModel;
				return doRedraw !== false ? redraw(0) : vm;
			},
			on: function(ev, fn) {
				addHandlers(vm.events, ev, fn);
			},
			hook: function(ev, fn) {
				vm.hooks = vm.hooks || {};
				addHandlers(vm.hooks, ev, fn);
			},
		//	off: function(ev, fn) {},
			events: {},		// targeted bubbling events & _redraw requests
			hooks: null,		// willMount,didMount,willRedraw,didRedraw,willUnmount,didUnmount,
			redraw: cfg.useRaf ? u.raft(redraw) : redraw,
		//	patch: cfg.useRaf ? raft(patchNode) : patchNode,		// why no repaint?
			patch: patchNode,
			emit: emit,
			refs: {},
			parent: null,
			body: [],
			mount: function(parentEl, isRoot) {
				var withEl = null;

				if (isRoot) {
					parentEl.textContent = '';
					withEl = parentEl;
					parentEl = null;
				}

				hydrateNode(vm.node, withEl, null, parentEl);
				return vm;
			},
			attach: function(rootEl) {
				hydrateWith(vm.node, rootEl);		// will/didAttach?
				return vm;
			},
		//	detach: detach,
			unmount: function() {
				cleanNode(vm.node);
			},
			// internal util funcs
			moveTo: moveTo,
			updIdx: updIdx,
		};

		opts && opts.hooks && vm.hook(opts.hooks);

		u.execAll(vmExts, vm);

		vm.render = viewFn.call(vm.api, vm, model, key);

		if (parentNode)
			return moveTo(parentNode, idxInParent);
		else
			return redraw(0);

		function addHandlers(ctx, ev, fn) {
			if (fn) {
				ctx[ev] = ctx[ev] || [];
				ctx[ev].push(fn);
			}
			else {
				for (var i in ev) {
					ctx[i] = ctx[i] || [];
					ctx[i].push(ev[i]);
				}
			}
		}

		// transplants node into tree, optionally updating model
		// TODO: should this set node.moved = true?
		function moveTo(parentNodeNew, idxInParentNew, newModel) {
			parentNode = parentNodeNew;
			updIdx(idxInParentNew);
			vm.update(newModel, false);

			if (vm.node != null)
				parentNode.body[idxInParent] = vm.node;

			return redraw(0, false);
		}

		function updIdx(idxInParentNew) {
			idxInParent = idxInParentNew;
		}

		/* TODO
		function spliceNodes() {}
		*/

		function coerceEmpty(val) {
			return val == null ? "" : val;
		}

		// need disclaimer that targ and new must be same type
		// and must have matching keyes if are keyed
		// newTpl can be object with {class: , style: }
		function patchNode(targNode, newTpl) {
			var isCurNode = targNode.el != null;

			if (u.isObj(newTpl)) {
				// (won't work to removeAttr class/style attrs via setting to false)
				var cls = "class" in newTpl ? ((coerceEmpty(targNode.class) + " ") + coerceEmpty(newTpl.class)).trim() : targNode.props.class;
				var sty = "style" in newTpl ? newTpl.style : targNode.props.style;

				// only create faux newNode if no followup graftNode() is expected as with willRecycle()
				// hooks...and we're simply patching the current/old node in-place
				if (isCurNode) {
					var props = Object.create(targNode.props);

					props.class = cls;
					props.style = sty;

					var newNode = {
						tag: targNode.tag,
						el: targNode.el,
						ns: targNode.ns,
						props: props,
					};

					patchProps(newNode, targNode);
				}

				// if we're patching newly created node, then it's sufficient to reset the new node's props and
				// allow any followup graftNode to handle the patching
				targNode.props.class = cls;
				targNode.props.style = sty;
			}
			else {
				var donor = targNode,
					parent = donor.parent,
					newNode = buildNode(initNode(newTpl, parent, donor.idx, vm), donor);

				parent.body[donor.idx] = newNode;
			}
		}

		function redraw(level, isRedrawRoot) {
			isRedrawRoot = isRedrawRoot !== false;

			if (isRedrawRoot && didHooks.length) {
				pendRedraws.push([redraw, level, isRedrawRoot]);
				return vm;
			}

			if (level) {
				var targ = vm;
				while (level-- && targ.parent) { targ = targ.parent; }
				targ.redraw(0, true);
				return targ.vm;
			}

			var old = vm.node;

			old && fireHook(vm, "willRedraw", vm);

			var oldRefs = vm.refs;
			vm.refs = {};	// null?
			vm.body = [];	// null?

		//	vm.keyMap = {};

			var def = vm.render.call(vm.api, vm, model, key);

			var node;

			// return false from render or _diff to reuse (indicates no changes)
			// todo: re-bubble ^ refs?, fire hooks?
			if (def === false || (node = initNode(def, parentNode, idxInParent, vm, true)) && isSame(old, node)) {
				old.moved = true;
				old.wasSame = true;
				vm.refs = oldRefs;
				return vm;
			}

			node.vm = vm;
			vm.node = node;

			// unjailed vm root keys, will propagate up
			var unjRef =
				(u.isVal(key)      && key[0]      === "^") ? key.substr(1) :
				(u.isVal(node.ref) && node.ref[0] === "^") ? node.ref.substr(1) :
				null;

			node.key = key != null ? key : node.key;

			// set parent vm for easy traversal
			var ancest = parentNode;
			while (ancest) {
				if (ancest.vm) {
					if (!vm.parent) {
						vm.parent = ancest.vm;
						ancest.vm.body.push(vm);
					}
					if (unjRef !== null)
						u.deepSet(ancest.vm.refs, unjRef, node);
				}

				ancest = ancest.parent;
			}

			var donor = old;

			// clear donor if new tag, will replaceNode
			if (old && (node.type !== old.type || node.tag !== old.tag)) {
				donor = null;
				var repl = true;
				var oldParentEl = old.el.parentNode;
			}

			buildNode(node, donor);

			// slot sef into parent
			if (parentNode)
				parentNode.body[idxInParent] = node;

			if (isRedrawRoot) {
				old && cleanNode(old);

				// hydrate on all but initial root createView/redraw (handled in mount()/attach())
				(old || !isRootNode) && hydrateNode(node, null, node.el);			// parentNode.el.firstChild?

				// bug: this bypasses hooks
				if (repl)
					insertNode(node, oldParentEl.childNodes[old.idx], oldParentEl);
			}

			old && fireHook(vm, "didRedraw", vm);

			if (isRedrawRoot !== false)
				u.tick(drainDidHooks, 2);

			return vm;
		}

		function emit(event) {
			var args = Array.prototype.slice.call(arguments);

			var targ = vm, ev;

			while (targ) {
				if (ev = targ.events[event]) {
					args[0] = ev;
					u.execAll.apply(null, args);
					break;
				}
				targ = targ.parent;
			}
		}
	}

	// absorbs active dom, assumes it was built by dumping the html()
	// of this node into innerHTML (isomorphically)
	// (todo: bind/refs)
	function hydrateWith(node, withEl) {
		node.el = withEl;
		withEl._node = node;

		// patch props not present in HTML attrs
		for (var prop in node.props) {
			var val = node.props[prop],
				name = u.isEvProp(prop) ? prop : prop[0] === "."  ? prop.substr(1) : null;

			if (name !== null)
				withEl[name] = val;
		}

		if (u.isArr(node.body)) {
			for (var i = 0; i < node.body.length; i++) {
				var node2 = node.body[i];
				hydrateWith(node2, withEl.childNodes[i]);
			}
		}
	}

	function fireHook(ctx, name, arg1, arg2, arg3, arg4) {
		if (ctx && ctx.hooks) {
			var hooks = ctx.hooks[name];
			if (!hooks) return;

			if (cfg.useRaf && name.substr(0,3) == "did")
				didHooks.push([u.execAll, hooks, arg1, arg2, arg3, arg4]);
			else
				return u.execAll(hooks, arg1, arg2, arg3, arg4);
		}
	}

	function cleanNode(node, prom) {
		var removeSelf = node.el && !node.moved;

		if (removeSelf) {
			var resUnm = fireHook(node.vm, "willUnmount", node.vm);
			var resRem = fireHook(node, "willRemove", node);

			var newProm = resUnm || resRem;

			node.removed = true;
		}

		if (node.wasSame)
			node.wasSame = false;
		else {
			if (u.isArr(node.body)) {
				node.body.forEach(function(n, i) {
					cleanNode(n, prom || newProm);
				});
			}

			if (!prom) {
				if (newProm) {
					newProm.then(function() {
						removeNode(node, removeSelf);
					});
				}
				else
					removeNode(node, removeSelf);
			}
		}

		node.moved = false;
	}

	function removeNode(node, removeSelf) {
		if (node.el == null || !node.el.parentNode)
			return;

		if (removeSelf) {
			node.el.parentNode.removeChild(node.el);
			node.el = null;

	//		if (node.parent)
	//			node.parent.body[node.idx] = null;

			// fire hooks, get promises
			var resUnm = fireHook(node.vm, "didUnmount", node.vm);
			var resRem = fireHook(node, "didRemove", node);

		}

		if (u.isArr(node.body)) {
			node.body.forEach(function(n, i) {
				removeNode(n, !n.moved);
			});
		}
	}

	// builds out node, excluding views
	function initNode(def, parentNode, idxInParent, ownerVm, noBody) {
		var node = procNode(def, ownerVm);

		// store a ref to this node for later ref collection to avoid full tree walking
		if (node.ref !== null)
			u.deepSet(ownerVm.refs, node.ref, node);

		node.parent = parentNode;
		node.idx = idxInParent;
		node.ns = parentNode && parentNode.ns ? parentNode.ns : (node.tag === "svg" || node.tag === "math") ? node.tag : null;

		if (!noBody && !node.diff && u.isArr(node.body))
			initBody(node, ownerVm);

		return node;
	}

	function initBody(node, ownerVm) {
		for (var i = 0, len = node.body.length; i < len; i++) {
			var def2 = node.body[i];

			var key = null, node2 = null, killIt = false, mergeIt = false;

			// getters
			if (u.isFunc(def2))
				def2 = def2();

			// kill null and undefined nodes
			if (def2 == null)
				killIt = true;
			else {
				var def2IsArr = u.isArr(def2),
					def2IsObj = def2IsArr ? false : u.isObj(def2);		// technically, isPlainObj

				if (def2IsArr) {
					// kill empty array nodes
					if (!def2.length)
						killIt = true;
					// tag node
					else if (typeof def2[0] == "string" && def2[0] !== "") {
						node2 = initNode(def2, node, i, ownerVm);
						key = node2.key;
					}
					// decl sub-view
					else if (u.isFunc(def2[0]))
						key = getViewKey(def2[1], def2[2]);
					// handle arrays of arrays, avoids need for concat() in tpls
//					else if (u.isArr(def2[0]))
//						mergeIt = true;
					else
						mergeIt = true;
				}
				else if (def2IsObj) {
					if (u.isFunc(def2.redraw)) {	// pre-init vm
						def2.moveTo(node, i);
						node2 = def2.node;
						key = def2.view[1];
					}
					else if (u.isElem(def2))
						node2 = initNode(def2, node, i, ownerVm);
					else {
						node.body[i--] = ""+def2;
						continue;
					}
				}
				else {
					if (def2 === "")
						killIt = true;
					// merge if adjacent text nodes
					else if (i > 0 && node.body[i-1].type === u.TYPE_TEXT) {		//  && u.isVal(def2)
						node.body[i-1].body += ""+def2;
						killIt = true;
					}
					else
						node2 = initNode(""+def2, node, i, ownerVm);
				}
			}

			if (killIt || mergeIt) {
				if (mergeIt)
					u.insertArr(node.body, def2, i, 1);
				else
					node.body.splice(i,1);

				len = node.body.length;
				i--; continue;	// avoids de-opt
			}

			if (key !== null)
				node.hasKeys = true;

			node.body[i] = node2 || def2;
		}

		// flag body as processed
		node.body._init = true;
	}

	// def is tpl returned by render()
	// old is matched donor vnode obj
	function buildNode(node, donor) {
		if (isSame(donor, node)) {
			donor.moved = true;
			donor.wasSame = true;
			return donor;
		}

		if (donor) {
			fireHook(node, "willRecycle", donor, node);
			graftNode(donor, node);
			fireHook(node, "didRecycle", donor, node);
		}

		if (u.isArr(node.body)) {
			if (!node.body._init) {
				var par = node;
				while (!par.vm)
					par = par.parent;
				initBody(node, par.vm);
			}

			// this is an optimization so a full old branch rescan is not needed to find a donor for each new node.
			// if nodes are contiguously donated (as in mostly static branches), then we know nothing to donate above
			// them and start search lower on every iteration
			var lastContigDonor2Idx = 0;

			node.body.forEach(function(kid, i) {
				var isDeclView = u.isArr(kid);

				if (donor) {
					var donor2loc = findDonor(kid, node, donor, lastContigDonor2Idx);			// , i, i		// if flagged node._static, just use i,i / DONOR_NODE

					if (donor2loc !== null) {
						var donor2idx = donor2loc[0];
						var donor2type = donor2loc[1];

						// if donor was found in parallel pos, advance contig range
						if (donor2idx === lastContigDonor2Idx)
							lastContigDonor2Idx++;

						var donor2 = donor.body[donor2idx];

						if (donor2.vm) {
							if (isDeclView) {
								if (donor2type === DONOR_NODE)
									donor2.vm.moveTo(node, i, kid[1]);
								else if (donor2type === DONOR_DOM) {
									// TODO: instead, re-use old dom with new node here (loose match)
									createView(kid[0], kid[1], kid[2], kid[3], node, i);
									return;
								}
							}
							// pre-init vm
							else if (kid.vm) {
								if (donor2type === DONOR_NODE && kid.vm === donor2.vm)
								donor2.vm.moveTo(node, i);
							}
						}
						else
							node.body[i] = buildNode(kid, donor2);

						return;
					}
				}
				// fall through no donor found
				if (isDeclView)
					createView(kid[0], kid[1], kid[2], kid[3], node, i);
				else
					node.body[i] = buildNode(kid);
			});
		}

		return node;
	}

	function hydrateNode(node, withEl, sibAtIdx, parentEl) {
		var wasDry = !node.el;

		// advance through any nodes marked for removal
		while (sibAtIdx && sibAtIdx._node.removed)
			sibAtIdx = sibAtIdx.nextSibling;

		wasDry && fireHook(node.vm, "willMount", node.vm);

		if (node.type == u.TYPE_ELEM) {
			if (wasDry) {
				node.el = withEl || (node.ns ? doc.createElementNS(NS[node.ns], node.tag) : doc.createElement(node.tag));
				node.props && patchProps(node);
			}

			if (u.isArr(node.body)) {
				for (var i = 0, nextSib = node.el.firstChild; i < node.body.length; i++)
					nextSib = hydrateNode(node.body[i], null, nextSib);		// node.el
			}

			// for body defs like ["a", "blaahhh"], entire body can be dumped at once
			else if (u.isVal(node.body)) {
				if (node.raw)
					node.el.innerHTML = node.body;
				else if (wasDry)
					node.el.textContent = node.body;
			}
		}
		// for body defs like ["foo", ["a"], "bar"], create separate textnodes
		else if (node.type == u.TYPE_TEXT && wasDry)
			node.el = doc.createTextNode(node.body);

		// reverse-ref
		node.el._node = node;

		// slot this element into correct position
		var par = node.parent;

		// insert and/or reorder
	//	if (par && par.el && par.el.childNodes[node.idx] !== node.el)
		if (sibAtIdx !== node.el && (parentEl || par && par.el)) {
			var type = wasDry ? "Insert" : "Reinsert";
			fireHook(node, "will" + type, node);
			insertNode(node, sibAtIdx, parentEl);
			fireHook(node, "did" + type, node);
		}

		if (wasDry && node.vm && node.vm.hooks && !node.moved)
			fireHook(node.vm, "didMount", node.vm);

		return sibAtIdx !== node.el ? sibAtIdx : sibAtIdx.nextSibling;
	}

	function insertNode(node, sibAtIdx, parentEl) {
	//	var par = ;
		(parentEl || node.parent.el).insertBefore(node.el, sibAtIdx);
	//	par.el.insertBefore(node.el, par.el.childNodes[node.idx]);
	//	return [node];
	}

	function findDonor(node, newParent, oldParent, fromIdx, toIdx) {
		var newIsView = u.isArr(node);
		var newKey = newIsView ? getViewKey(node[1], node[2]) : node.key;
		var oldKeys = oldParent.hasKeys;
		var newKeys = newParent.hasKeys;
		var oldBody = oldParent.body;
		var newBody = newParent.body;

		// fast exact match by key
		if (newKey !== null && oldKeys) {
			var idx = u.keyedIdx(newKey, oldBody, newIsView ? node[0] : null);
			if (idx > -1)
				return [idx, DONOR_NODE];
			return null;
		}

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
					// exact match by key
					if (o.vm.view[1] === getViewKey(node[1], node[2]))
						return [i, DONOR_NODE];

					var existsInNew = false;

					/*
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
					*/

					// removed keyed view = can reuse its DOM if by end of list, no exacts were found
					if (!existsInNew && !approx && newKeys && u.keyedIdx(o.key, newBody, o.vm.view[0]) == -1)
						approx = [i, DONOR_DOM];
				}
			}
			else if (areSimilar(o, node))
				// matching dom nodes without keys
				if (o.key === null || (!newKeys || u.keyedIdx(o.key, newBody, o.vm ? o.vm.view[0] : null) == -1))
					return [i, DONOR_DOM];
		}

		return approx;
	}

	function isSame(o, n) {
		if (o && o.diff && n.diff && o.diff[0] === n.diff[0]) {
			var params = o.diff.slice(1).concat(n.diff.slice(1));
			return !n.diff[0].apply(null, params);
		}
		return false;
	}

	function areSimilar(o, n) {
		return n.type === o.type && (n.type === u.TYPE_TEXT || n.tag !== null && n.tag === o.tag);
	}

	function graftNode(o, n) {
		// move element over
		n.el = o.el;
		o.el = null;

		if (n.el)
			n.el._node = n;

		if (n.type === u.TYPE_TEXT && n.body !== o.body) {
			n.el.nodeValue = n.body;
			return;
		}

		patchProps(n, o);

		var nTxt = !u.isArr(n.body);
		var oTxt = !u.isArr(o.body);

		// []|text -> text
		if (nTxt && n.body !== o.body) {
			if (oTxt && n.el.firstChild)
				n.el.firstChild.nodeValue = n.body;
			else {
				if (n.raw)
					n.el.innerHTML = n.body;
				else
					n.el.textContent = n.body;
			}
		}
		// text -> []
		else if (oTxt && !nTxt)
			n.el.textContent = "";

		o.moved = true;

	//	return [o, n];
	}

	function procTag(raw, node) {
		var tag = tagCache[raw];

		if (!tag) {
			var dflt = ["",""];

			tag = {
				tag:   (raw.match( /^[-\w]+/)    || ["div"])[0],
				id:    (raw.match( /#([-\w]+)/)  ||    dflt)[1],
				class: (raw.match(/\.([-\w.]+)/) ||    dflt)[1].replace(/\./g, " "),
			};

			tagCache[raw] = tag;
		}

		node.tag = tag.tag;

		if (tag.id || tag.class) {
			var p = node.props || {};

			if (tag.id && p.id == null)
				p.id = tag.id;
			if (tag.class) {
				node.class = tag.class;
				p.class = tag.class + (p.class != null ? (" " + p.class) : "");
			}

			node.props = p;
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
			wasSame: false,
			removed: false,
			hooks: null,	// willInsert,didInsert,willRecycle,didRecycle,willReinsert,didReinsert,willRemove,didRemove
			tag: null,
			class: null,	// this is the fixed class parsed from the tag, since "tag.class" is additive to {class:...}
//			svg: false,
//			math: false,
			ns: null,
			guard: false,	// created, updated, but children never touched
			raw: false,
			props: null,
//			on: null,
			el: null,
			hasKeys: false,	// holds idxs of any keyed children
			body: null,
		};

		// getters
		if (u.isFunc(raw))
			raw = raw();

		var len = raw.length;

		if (u.isArr(raw) && len) {
			node.type = u.TYPE_ELEM;

			if (len > 1) {
				var bodyIdx = 1;

				if (u.isObj(raw[1]) && !raw[1].redraw && !u.isElem(raw[1])) {
					node.props = raw[1];
					bodyIdx = 2;
				}

				if (len == bodyIdx + 1)
					node.body = u.isVal(raw[bodyIdx]) ? raw[bodyIdx] : u.isFunc(raw[bodyIdx]) ? raw[bodyIdx]() : raw.slice(bodyIdx);
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
		else if (u.isVal(raw)) {
			node.type = u.TYPE_TEXT;
			node.body = raw;
		}
		// raw elements
		else if (u.isElem(raw)) {
			node.type = u.TYPE_ELEM;
			node.el = raw;
			node.tag = raw.nodeName.toLowerCase();
		}

		return node;
	}

	// note: these handlers are usually defined in the view closure or
	// render() so already have access to vm, no need to pass it back
	function wrapHandler(fns, ctx, node, ownerVm) {
		var handler = function(e) {
			var res, vnode = e.target._node, data = null;

			// plain cb
			if (u.isFunc(fns))
				res = fns.call(ctx, e, vnode, ownerVm);
			// parameterized cb: [cb, arg1...]
			else if (u.isArr(fns)) {
				data = fns.slice(1);
				res = fns[0].apply(ctx, data.concat(e, vnode, ownerVm));
			}
			// object of deleg handlers {".moo": ...}
			else if (u.isObj(fns)) {
				for (var filt in fns) {
					var cb = fns[filt];
					if (cb == null || filt[0] == "_") continue;
					if (e.target.matches(filt)) {
						// deleg + parameterized
						if (u.isArr(cb)) {
							data = cb.slice(1);
							res = cb[0].apply(ctx, data.concat(e, vnode, ownerVm));
						}
						// deleg & plain cb
						else if (u.isFunc(cb))
							res = cb.call(ctx, e, vnode, ownerVm);
					}
				}
			}

			if (res === false) {
				e.preventDefault();
				e.stopPropagation();		// yay or nay?
			}

			if (ownerVm.opts.hasOwnProperty("watch")) {
				var watchEv = {type: "event", vm: ownerVm, node: vnode, event: e, data: data};
				ownerVm.opts.watch.fire(watchEv);			// use ctx here also?
			}
		};

		return handler;
	}

	function procProps(props, node, ownerVm) {
		for (var i in props) {
			// wrapHandler() runs later in patch() and needs the vm + node
			if (u.isEvProp(i)) {}
			// getters
			else if (u.isFunc(props[i])) {
				// for router
				if (i == "href") {
					props.onclick = props[i];
					props.href = props[i].href;
				}
				else
					props[i] = props[i]();
			}

			// dynamic props get auto-added from attrs defs
			if (u.isDynProp(node.tag, i))
				props["."+i] = props[i];
		}

		if (u.isObj(props.style)) {
			for (var pname in props.style) {
				var val = props.style[pname];
				if (u.isFunc(val))
					props.style[pname] = val();
			}
		}

		if (u.isObj(props._hooks)) {
			node.hooks = props._hooks;
			props._hooks = null;
		}

		node.key =
			u.isVal(props._key)	? props._key	:
			u.isVal(props._ref)	? props._ref	:
			u.isVal(props.id)	? props.id		:
			u.isVal(props.name)	? props.name	: null;

		if (props._ref != null)
			node.ref = props._ref;
		if (props._raw)
			node.raw = true;
		if (props._data != null)
			node.data = props._data;
		if (props._diff)
			node.diff = props._diff;

		props._ref =
		props._key =
		props._raw =
		props._data =
		props._diff = null;
	}

	function patchProps(n, o) {
		var init = !o;

		o = o || {};

		if (o.props || n.props) {
			var op = o.props || {};
			var np = n.props || {};

			var os = op.style;
			var ns = np.style;

			if (u.isObj(os) || u.isObj(ns)) {
				patch(n.el, n.tag, os || {}, ns || {}, setCss, delCss, n.ns, init, n);
				op.style = np.style = null;
			}

			// alter attributes
			patch(n.el, n.tag, op, np, setAttr, delAttr, n.ns, init, n);

			if (ns)
				np.style = ns;
		}
	}

	// op = old props, np = new props, set = setter, del = unsetter
	function patch(targ, tag, op, np, set, del, ns, init, node) {
		for (var name in np) {
			var nval = np[name];

			if (nval === null) continue;

			// get old value from old node (attrs) or from DOM (props)
			var oval = name[0] === "." ? targ[name.substr(1)] : op[name];

			if (nval !== oval) {
				// shallow-diffs array props, eg. onclick: [fn, arg1, arg2]
				if (u.isArr(nval) && u.isArr(oval) && u.cmpArr(nval, oval))
					continue;
				// add new or mutate existing not matching old
				set(targ, name, nval, ns, init, node);
			}
		}
		// remove any removed
		for (var name in op) {
			if (op[name] === null) continue;

			if (np[name] == null)
				del(targ, name, ns, init);
		}
	}

//  function setEvt(targ, name, val) {targ.addEventListener(name, val, false);};	// tofix: if old node exists (grafting), then don't re-add
//  function delEvt(targ, name, val) {targ.removeEventListener(name, val, false);};

//	function setData(targ, name, val, ns, init) {targ.dataset[name] = val;};
//	function delData(targ, name, ns, init) {targ.dataset[name] = "";};

	function setCss(targ, name, val) {targ.style[name] = u.autoPx(name, val);}
	function delCss(targ, name) {targ.style[name] = "";}

	function setAttr(targ, name, val, ns, init, node) {
		if (name[0] === ".") {
			var n = name.substr(1);
			if (ns === "svg")
				targ[n].baseVal = val;
			else
				targ[n] = val;
		}
		else if (name === "class")
			targ.className = val;
		else if (name === "id")
			targ[name] = val;
		else if (u.isEvProp(name)) {	// else test delegation for val === function vs object
			var par = node;
			while (!par.vm)
				par = par.parent;
			targ[name] = wrapHandler(val, par.vm.opts.evctx || par.vm.model || null, node, par.vm);
		}
		else if (val === false)
			delAttr(targ, name, ns, init);
		else
			targ.setAttribute(name, val === true ? "" : val);
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
		else if (name === "id" || u.isEvProp(name))
			targ[name] = null;
		else
			targ.removeAttribute(name);
	}
})(domvm);