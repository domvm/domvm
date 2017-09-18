T.time("Setup");

var el = domvm.defineElement,
	tx = domvm.defineText,
	vw = domvm.defineView;

Object.defineProperties(Array.prototype, {
    flatMap: {
        value: function(lambda) {
            return Array.prototype.concat.apply([], this.map(lambda));
        }
    }
});

function prop(val, cb, ctx, args) {
	return function(newVal, execCb) {
		if (newVal !== undefined && newVal !== val) {
			val = newVal;
			execCb !== false && typeof cb === "function" && cb.apply(ctx, args);
		}

		return val;
	};
}

function error(msg, data) {
	return Promise.reject({
		message: msg,
		data: data,
	});
}

// api endpoints with data extraction & transport fault handling
const endPoints = {
	getThreadList: _ =>
		xr.get(T.apiUrl  + "/threads/")
		.then(r => r.data.data)
		.catch(r => error("Could not load thread list", r)),
	getComments: parentId =>
		xr.get(T.apiUrl  + "/comments/" + parentId)
		.then(r => T.transformResponse(r.data))
		.catch(r => error("Could not load comments of #" + parentId, r)),
	postThread: text =>
		xr.post(T.apiUrl + "/threads/create", {text: text})
		.catch(r => error("Could not create thread", r)),
	postComment: (text, parentId) =>
		xr.post(T.apiUrl + "/comments/create", {text : text, parent: parentId})
		.catch(r => error("Could not create comment", r)),
};

function statusTpl(msg) {
	return el("p.status", {style: "font-weight: bold;"},  msg);
}

// error formatter
function errorTpl(error) {
	var data = error.data;

	try {
		data.response = JSON.parse(data.response);
	} catch(e) {}

	return el(".error", [
		el("strong", error.message),
		el("hr"),
		el("pre", JSON.stringify(data, null, 2)),
	]);
}

function ThreaditView(vm, deps) {
	return function() {
		return el(".body", [
			el("p.head_links", [
				el("a", {href: "https://github.com/leeoniya/domvm/tree/master/demos/threaditjs"}, "Source"),
				tx(" | "),
				el("a", {href: "http://threaditjs.com"}, "ThreaditJS Home")
			]),
			el("h2", [
				el("a", {href: "http://leeoniya.github.io/domvm/demos/threaditjs/"}, "ThreaditJS: domvm")
			]),
			el(".main", [
				V2
			])
		]);
	};
}

function ThreadListView(vm) {
	function onClick(threadId) {
		loadComments(threadId);
		return false;
	}

	return function(vm, data) {
		return data.error ? errorTpl(data.error)
		: data.threads.length == 0 ? statusTpl("Loading thread list...")
		: el(".threads", data.threads.flatMap(thread => [
			el("p", [
				//	deps.router.href("thread", {id: thread.id})			r.goto("comment", [5]);  onclick: [onClick, thread.id]
				el("a", {href: R.href('thread', { id: thread.id }), ".innerHTML": T.trimTitle(thread.text)})
			]),
			el("p.comment_count", thread.comment_count + " comment" + (thread.comment_count !== 1 ? "s" : "")),
			el("hr"),
		]).concat(
			vw(ThreadSubmitView)
		));
	};
}

// status
const ERROR			= -1,
	  LOADING		= 0,
	  INTERACTING	= 1,
	  SUBMITTING	= 2,
	  RELOADING		= 3,
	  LOADED		= 4;

function ThreadSubmitView(vm) {
	var status = prop(LOADED, vm.redraw.bind(vm));
	var error;

	function postThread() {
		status(SUBMITTING);

		endPoints.postThread(vm.refs.text.el.value)
			.then(_ => {
				status(RELOADING);
				return loadThreadList(true);
			})
			.then(_ => {
				status(LOADED, false);
				vm.parent().redraw();
			})
			.catch(e => {
				error = e;
				status(ERROR);
			});

		return false;
	}

	return function(vm) {
		return (
		  status() == ERROR      ? errorTpl(error)
		: status() == SUBMITTING ? statusTpl("Submitting thread...")
		: status() == RELOADING  ? statusTpl("Submitted! Reloading thread list...")
		: el("form", {onsubmit: postThread}, [
				el("textarea", {_ref: "text"}),
				el("input", {type: "submit", value: "Post!"})
			])
		)
	}
}

// CommentsView
// sub-view (will be used recursively)
function ThreadBranchView(vm) {
	return function(vm, data) {
		return data.error ? errorTpl(data.error)
		: data.comment == null ? statusTpl("Loading comments of thread #" + data.threadId)
		: el(".comment", [
			el("p", {".innerHTML": data.comment.text}),
			vw(CommentReplyView, data.comment),
			el(".children", data.comment.children.map(comment2 =>
				vw(ThreadBranchView, {comment: comment2})
			))
		]);
	}
}

// todo: should optionally set route?
function setView(view, data) {
	V2 = vw(view, data);
	V && V.redraw();
}

function loadEndpt(endPt, reqArgs, view, preData, procData) {
	// sets loading message
	if (preData != null)
		setView(view, preData);

	return endPt.apply(null, reqArgs)
		.then(r => setView(view, procData(r)))
		.catch(e => setView(view, {error: e}))
}

function loadThreadList(soft) {
	return loadEndpt(endPoints.getThreadList, [], ThreadListView, soft ? null : {threads: []}, l => ({threads: l}));
}

function loadComments(threadId, soft) {
	return loadEndpt(endPoints.getComments, [threadId], ThreadBranchView, soft ? null : {comment: null, threadId: threadId}, c => ({comment: c.root, threadId: threadId}));
}


// sub-sub view
function CommentReplyView(vm, comment) {
	var redraw = vm.redraw.bind(vm);
	var status = prop(LOADED, redraw);
	var error;

	var tmpComment = prop("", redraw);

	function toggleReplyMode(e) {
		status(INTERACTING);
		return false;
	}

	function postComment(e) {
		status(SUBMITTING);

		// TODO: flatten? dry?
		endPoints.postComment(tmpComment(), comment.id)
			.then(comment2 => {
				tmpComment("", false);
				status(RELOADING);
				return endPoints.getComments(comment.id);
			})
			.then(c => {
				comment.children = Object.values(c.lookup).slice(1);	// have to slice off self
				status(LOADED, false);
				vm.parent().redraw();
			})
			.catch(e => {
				error = e;
				status(ERROR);
			});

		return false;
	}

	function previewReply(e, node) {
		tmpComment(node.el.value);
	}

	return function() {
		return (
		  status() == ERROR			? errorTpl(error)
		: status() == SUBMITTING	? statusTpl("Submitting comment...")
		: status() == RELOADING		? statusTpl("Submitted! Reloading comments...")
		: el(".reply", [
			status() == INTERACTING ?
			el("form", {onsubmit: postComment}, [
				el("textarea", {
					value: tmpComment(),
					onkeyup: [previewReply],
				}),
				el("input", {type: "submit", value: "Reply!"}),
				el(".preview", {".innerHTML": T.previewComment(tmpComment())}),
			])
			: el("a", {href: "#", onclick: toggleReplyMode}, "Reply!")
			])
		);
	}
}


var V = null,		// root view
	V2 = null;		// sub-view (content)

var titlePre = "ThreaditJS: domvm | ";

// root router
var R = createRouter({
	prefix: "#",
	willEnter: function(r) {
		if (V != null) return;

		var hooks = {
			willRedraw: vm => console.time("redraw"),
			didRedraw: vm => console.timeEnd("redraw"),
		};

		V = domvm.createView(ThreaditView, null, null, {hooks: hooks}).mount(document.body);
	},
	routes: [
		{
			name: "threadList",
			path: "/",
			title: titlePre + "Thread List",
			onenter: function() {
				T.timeEnd("Setup");
				loadThreadList();
			},
		},
		{
			name: "thread",
			path: "/threads/:id",
//			vars: {id: /[a-zA-Z0-9]{5,7}/},
			title: s => titlePre + "Thread #" + s.id,
			onenter: function(s) {
				T.timeEnd("Setup");
				loadComments(s.id);
			},
		},
	]
});

R.boot(true);