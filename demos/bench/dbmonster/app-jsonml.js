var j = domvm.jsonml;

/*
// naive implementation, no optims
function DBMonView() {
	return (vm, dbs) => j(
		["div",
			["table.table.table-striped.latest-data",
				["tbody", dbs.map((db, i) =>
					["tr",
						["td.dbname", db.dbname],
						["td.query-count",
							["span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries]
						],
						db.lastSample.topFiveQueries.map(query =>
							["td", { class: query.elapsedClassName },
								["span", query.formatElapsed],
								[".popover.left",
									[".popover-content", query.query],
									[".arrow"],
								]
							]
						)
					]
				)]
			]
		]
	);
}
*/

// avoids array flattening, uses concat()
function DBMonView() {
	return (vm, dbs) => j(
		["div",
			["table.table.table-striped.latest-data",
				["tbody", dbs.map((db, i) =>
					["tr",
						["td.dbname", db.dbname],
						["td.query-count",
							["span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries]
						]
					].concat(db.lastSample.topFiveQueries.map(query =>
						["td", { class: query.elapsedClassName },
							["span", query.formatElapsed],
							[".popover.left",
								[".popover-content", query.query],
								[".arrow"],
							]
						]
					))
				)]
			]
		]
	);
}

/*
// sub-view & diff (avoids array flattening)
function DBMonView() {
	return (vm, dbs) => j(
		["div",
			["table.table.table-striped.latest-data",
				["tbody", dbs.map(db =>
					[DB, db, false]
				)]
			]
		]
	);
}

function DB(vm) {
	vm.diff(function(db) {
		return [db.lastMutationId];
	});

	return (vm, db) => j(
		["tr",
			["td.dbname", db.dbname],
			["td.query-count",
				["span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries]
			],
		].concat(db.lastSample.topFiveQueries.map(query =>
			[Query, query, false]
		))
	);
}

function Query(vm) {
	vm.diff(function(query) {
		return [query, query.elapsed];
	});

	return (vm, query) => j(
		["td", { class: query.elapsedClassName },
			["span", query.formatElapsed],
			[".popover.left",
				[".popover-content", query.query],
				[".arrow"],
			]
		]
	);
}
*/

let dbs		= null,
	raf		= null,
	vm		= domvm.createView(DBMonView),
	init	= true,
	avg		= [],
	len		= 5,
	start;

var instr = new DOMInstr(true);

function update(doRun) {
//	perfMonitor.startProfile('data update');
	dbs = ENV.generateData().toArray();
//	perfMonitor.endProfile('data update');

	!doRun && instr.start();
	perfMonitor.startProfile('vm.update()');
//	start = performance.now();

	vm.update(dbs);
	if (init) {
		vm.mount(document.getElementById("app"));
		init = false;
	}

//	avg.push(performance.now() - start);
//	if (avg.length > len)
//		avg.shift();
//	avgText.nodeValue = Math.round(1000 / (avg.reduce(function(pv, cv) { return pv + cv; }, 0) / len));

	perfMonitor.endProfile('vm.update()');
	!doRun && console.log(instr.end());

	if (doRun)
		raf = requestAnimationFrame(run2);
}

function step() {
	update(false);
}

function run2() {
	update(true);
}

function stop2() {
	cancelAnimationFrame(raf);
}

var flags =
	perfMonitor.MonitorWidgetFlags.HideMin |
	perfMonitor.MonitorWidgetFlags.HideMax |
	perfMonitor.MonitorWidgetFlags.HideLast |
	perfMonitor.MonitorWidgetFlags.HideGraph;

perfMonitor.startFPSMonitor(flags);
perfMonitor.initProfiler('vm.update()', flags);