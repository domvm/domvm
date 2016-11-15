var el = domvm.defineElement,
	tx = domvm.defineText,
	cm = domvm.defineComment,
	vw = domvm.defineView,
	iv = domvm.injectView,
	ie = domvm.injectElement;

// uncomment to optimize for fixed-layout nodes (no removal/insertion/reordering)
// var el = (tag, arg1, arg2) => domvm.defineElement(tag, arg1, arg2, domvm.FIXED_BODY);

/*
// naive implementation, no optims
function DBMonView() {
	return (vm, dbs) =>
		el("div", [
			el("table.table.table-striped.latest-data", [
				el("tbody", dbs.map(db =>
					el("tr", [
						el("td.dbname", db.dbname),
						el("td.query-count", [
							el("span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries)
						]),
						db.lastSample.topFiveQueries.map(query =>
							el("td", { class: query.elapsedClassName }, [
								el("span", query.formatElapsed),
								el(".popover.left", [
									el(".popover-content", query.query),
									el(".arrow"),
								])
							])
						)
					])
				))
			])
		])
}
*/


// avoids array flattening, uses concat()
function DBMonView() {
	return (vm, dbs) =>
		el("div", [
			el("table.table.table-striped.latest-data", [
				el("tbody", dbs.map(db =>
					el("tr", [
						el("td.dbname", db.dbname),
						el("td.query-count", [
							el("span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries)
						])
					].concat(db.lastSample.topFiveQueries.map(query =>
						el("td", { class: query.elapsedClassName }, [
							el("span", query.formatElapsed),
							el(".popover.left", [
								el(".popover-content", query.query),
								el(".arrow"),
							])
						])
					)))
				))
			])
		])
}


/*
// sub-view & diff (avoids array flattening)
function DBMonView() {
	return (vm, dbs) =>
		el("div", [
			el("table.table.table-striped.latest-data", [
				el("tbody", dbs.map(db =>
					vw(DB, db, false)
				))
			])
		])
}

function DB(vm) {
	vm.diff({
		vals: function(vm, db) {
			return [db.lastMutationId];
		}
	});

	return (vm, db) =>
		el("tr", [
			el("td.dbname", db.dbname),
			el("td.query-count", [
				el("span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries)
			]),
		].concat(db.lastSample.topFiveQueries.map(query =>
			vw(Query, query, false)
		)));
}

function Query(vm) {
	vm.diff({
		vals: function(vm, query) {
			return [query, query.elapsed];
		}
	});

	return (vm, query) =>
		el("td", { class: query.elapsedClassName }, [
			el("span", query.formatElapsed),
			el(".popover.left", [
				el(".popover-content", query.query),
				el(".arrow"),
			])
		]);
}
*/

let dbs		= null,
	raf		= null,
	vm		= null,
	init	= true,
	avg		= [],
	len		= 5,
	start;

function mount(appEl, dbs) {
	vm = domvm.createView(DBMonView, dbs, false);
	vm.mount(appEl);
}

function attach(appEl, dbs) {
	// isomorphic test
	var vw0 = domvm.createView(DBMonView, dbs, false);
	appEl.innerHTML = vw0.html();

	vm = domvm.createView(DBMonView, dbs, false);
	vm.attach(appEl.firstChild);
}

var instr = new DOMInstr(true);

var syncRedraw = true;

function update(doRun) {
//	perfMonitor.startProfile('data update');
	dbs = ENV.generateData().toArray();
//	perfMonitor.endProfile('data update');

	!doRun && instr.start();
	perfMonitor.startProfile('vm.update()');
//	start = performance.now();

	if (init) {
		var appEl = document.getElementById("app");
		mount(appEl, dbs);
	//	attach(appEl, dbs);
		init = false;
	}
	else
		vm.update(dbs, syncRedraw);

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