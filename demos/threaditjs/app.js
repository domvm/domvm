T.time("Setup");

var app = new ThreaditApp();

domvm.route(ThreaditRouter, app);

function ThreaditRouter(router, app) {
	router.config({
		useHist: false,
		root: "/domvm/demos/threaditjs",
		init: function() {
			app.view = domvm.view(ThreaditView, {app: app, router: router});

			app.view.mount(document.body);

			// add follow-up redraw timer
			domvm.view.config({useRaf: false});
			app.view.hook({
				willRedraw: function() { T.time("Full redraw()"); },
				didRedraw: function() { T.timeEnd("Full redraw()"); },
			});

			router.refresh();
		},
	});

	var titlePre = "ThreaditjS: domvm | ";

	return {
		threadList: {
			path: "/",
			onenter: function(segs) {
				document.title = titlePre + "Thread List";
				app.getThreads();
			},
		},
		thread: {
			path: "/threads/:id",
			vars: {id: /[a-zA-Z0-9]{5,7}/},
			onenter: function(segs) {
				document.title = titlePre + "Thread #" + segs.id;
				app.getComments(segs.id);
			},
		},
//		_noMatch: {
//			path: "/404",
//		}
	};
}

// model/state/api
function ThreaditApp() {
	var self = this;

	// mutation observer that'll reduce app.vm.redraw() boilerplate
	var w = domvm.watch(function(e) {
		self.view.redraw();
	});

	// additional noop observer just for ajax sugar methods
	var w0 = domvm.watch();

	this.threads	= w.prop([]);
	this.comments	= w.prop({});
	this.error		= w.prop(null);		// doubles as generic message for "loading"?

	function clearCache() {
		if (self.threads().length || self.comments().root || self.error()) {
			self.threads([]);
			self.comments({});
		}

		self.error(null, false);		// clears error without redraw
	}

	function setError(err) {
		self.error(err.message);
	}

	this.newThread = function(text, cb) {
		var onOk = function(resp) { self.threads().push(resp.data); cb && cb(); };
		return w.post(T.apiUrl + "/threads/create", {text: text}, [onOk, setError]);
	};

	this.newComment = function(parent, text, cb) {
		var onOk = function(resp) { parent.children.push(resp.data); cb && cb(); };
		return w0.post(T.apiUrl + "/comments/create", {text : text, parent: parent.id}, [onOk, setError]);
	};

	this.getThreads = function() {
		clearCache();
		var onOk = function(resp) { self.threads(resp.data); };
		T.timeEnd("Setup");
		return w.get(T.apiUrl + "/threads/" + ("?" + +new Date()), [onOk, setError]);
	};

	this.getComments = function(id) {
		clearCache();
		var onOk = function(resp) { self.comments(T.transformResponse(resp)); };
		T.timeEnd("Setup");
		w.get(T.apiUrl + "/comments/" + id + ("?" + +new Date()), [onOk, setError]);
	};
}

function ThreaditView(vm, deps) {
	return function() {
		var route = deps.router.location();

		return [".body",
			["p.head_links",
				["a", {href: "https://github.com/leeoniya/domvm/tree/master/demos/threaditjs"}, "Source"],
				" | ",
				["a", {href: "http://threaditjs.com"}, "ThreaditJS Home"]
			],
			["h2",
				["a", {href: "http://leeoniya.github.io/domvm/demos/threaditjs/"}, "ThreaditJS: domvm"]
			],
			[".main",
			 	deps.app.error() ?
			 	["p", ["strong", "Server's angry! "], deps.app.error]
			 	: route.name == "threadList"
			 	? [ThreadListView, deps, deps.app.threads]
			 	: route.name == "thread"
			 	? [ThreadBranchView, deps, deps.app.comments().root || false]
			 	: null,
			]
		]
	}
}

function ThreadListView(vm, deps, threads) {
	var submitting = false;

	// sub-template
	function threadListItemTpl(thread) {
		return [
			["p",
				["a", {href: deps.router.href("thread", {id: thread.id}), _raw: true}, T.trimTitle(thread.text)]			//	r.goto("comment", [5]);
			],
			["p.comment_count", thread.comment_count + " comment" + (thread.comment_count !== 1 ? "s" : "")],
			["hr"],
		]
	}

	function newThread(e, node) {
		submitting = true;
		vm.redraw();

		deps.app.newThread(vm.refs.text.el.value, function() {
			submitting = false;
		});

		return false;
	}

	return function() {
		return [".thread_list",
			!threads().length
				? ["p", {style: {marginBottom: 20, fontWeight: "bold"}}, "Loading threads..."]
				: threads().map(threadListItemTpl),
			submitting
			? ["p", {style: {fontWeight: "bold"}}, "Submitting thread..."]
			: ["form",  {onsubmit: newThread},
				["textarea", {_ref: "text"}],
				["input", {type: "submit", value: "Post!"}]
			]
		];
	}
}

// sub-view (will be used recursively)
function ThreadBranchView(vm, deps, comment) {
	return function() {
		return [".comment",
			!comment
			? ["p", {style: {marginBottom: 20, fontWeight: "bold"}}, "Loading thread " + deps.router.location().segs.id + "..."]
			: [
				["p", {_raw: true}, comment.text],
				[CommentReplyView, deps, comment],
				[".children", comment.children.map(function(comment2) {
					return [ThreadBranchView, deps, comment2];
				})]
			]
		];
	}
}

// sub-sub view
function CommentReplyView(vm, deps, comment) {
	var replying = false;
	var submitting = false;
	var tmpComment = "";

	function toggleReplyMode(e, node) {
		replying = !replying;
		vm.redraw();
		return false;
	}

	function newComment(e, node) {
		submitting = true;
		replying = false;
		vm.redraw();

		deps.app.newComment(comment, tmpComment, function() {
			submitting = false;
			tmpComment = "";
			vm.redraw(1);	// redraw parent
		});

		return false;
	}

	function previewReply(e, node) {
		tmpComment = node.el.value;
		vm.redraw();
	}

	return function() {
		return [".reply",
			submitting
			? ["p", {style: {fontWeight: "bold"}}, "Submitting reply..."]
			: replying
			? ["form", {onsubmit: newComment},
				["textarea", {
					value: tmpComment,
					onkeyup: previewReply,
				}],
				["input", {type: "submit", value: "Reply!"}],
				[".preview", {_raw: true}, T.previewComment(tmpComment)],
			]
			:
			["a", { href: "#", onclick: toggleReplyMode }, "Reply!"]
		];
	}
}