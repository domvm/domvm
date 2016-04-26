domvm.view.config({useRaf: false});

//----------------------------------------------------
// viewport occlusion culling
var rectCache = new WeakMap();
window.onscroll = window.onresize = domvm.utils.raft(function() {
	rectCache = new WeakMap();
});

// adapted from http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/26039199#26039199
function isElementPartiallyInViewport(el) {
	var rect = rectCache.get(el);

	if (!rect) {
		rect = el.getBoundingClientRect();
		rectCache.set(el, rect);
	}

    // DOMRect { x: 8, y: 8, width: 100, height: 100, top: 8, right: 108, bottom: 108, left: 8 }
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

    // http://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
    var vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
    var horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

    return (vertInView && horInView);
}
//----------------------------------------------------

function DBsView() {
	return function(vm, dbs) {
		return ["div",
			["table.table.table-striped.latest-data",
				["tbody",
					dbs.map(function(db) {
						return [DBView, db, false];
					//	return rowTpl(db);
					})
				]
			]
		];
	};
}

// diffing/caching sub-view
function DBView() {
	// immutable db memoization
	var oldver = null;

	return function(vm, db) {
		var newver = db.lastMutationId;

		// TODO: ensure that new model is re-injected, should only avoid hydrate/patch step
		if (oldver == newver || vm.node && !isElementPartiallyInViewport(vm.node.el))
			return false;

		oldver = newver;

		return rowTpl(db);
	};
}

function rowTpl(db) {
	var last = db.lastSample;

	return ["tr",
		["td.dbname", db.dbname],
		["td.query-count",
			["span", { class: last.countClassName }, last.nbQueries]
		],
		last.topFiveQueries.map(function(query) {
			return ["td.Query", { class: query.elapsedClassName },
				["span", query.formatElapsed],
				[".popover.left",
					[".popover-content", query.query],
					[".arrow"],
				]
			];
		})
	];
}

function genData() {
	return ENV.generateData().toArray();
}

var to;

function stop() {
	clearTimeout(to);
}

function update(loop) {
	dbmon.update(genData());

	Monitoring.renderRate.ping();

	if (loop)
		to = setTimeout(function() { update(loop); }, ENV.timeout);
}

function step() {
	instr.start(true);
	update(false);
	console.log(instr.end());
}

function loop() {
	update(true);
}

var instr = new DOMInstr(true);

console.time("initial render");
	console.time("vtree build");
		var dbmon = domvm.view(DBsView, genData(), false);
	console.timeEnd("vtree build");
	console.time("mount");
		instr.start(true);
		dbmon.mount(document.getElementById("app"));
		console.log(instr.end());
	console.timeEnd("mount");
console.timeEnd("initial render");

/*
// isomorphic test
var data = genData();

var vw0 = domvm.view(DBsView, data, false);
var html = domvm.html(vw0.node);
var appEl = document.getElementById("app");
appEl.innerHTML = html;

var dbmon = domvm.view(DBsView, data, false);
dbmon.attach(appEl.firstChild);
*/