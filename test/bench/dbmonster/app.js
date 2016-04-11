domvm.view.config({useRaf: false});

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
	var oldDb = null;

	return function(vm, db) {
		if (db === oldDb)
			return false;
		return rowTpl(oldDb = db);
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