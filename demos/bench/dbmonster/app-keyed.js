var el = domvm.defineElement,
	tx = domvm.defineText,
	cm = domvm.defineComment,
	vw = domvm.defineView,
	iv = domvm.injectView,
	ie = domvm.injectElement;

/*
// FIXED_BODY optimization for fixed-layout nodes (no removal/insertion/reordering)
el = function(tag, arg1, arg2) {
	return domvm.defineElement(tag, arg1, arg2, domvm.FIXED_BODY);
};
*/

function keyed(key, vnode) {
	vnode.key = key;
	return vnode;
}

// avoids array flattening, uses concat()
function DBMonView() {
	return function (vm, dbs) { return (
		el("div", [
			el("table.table.table-striped.latest-data", [
				el("tbody", {_flags: domvm.KEYED_LIST}, dbs.map(function(db, i) { return (
					keyed(i, el("tr", [
							el("td.dbname", db.dbname),
							el("td.query-count", [
								el("span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries)
							])
						].concat(db.lastSample.topFiveQueries.map(function(query) { return (
							el("td", { class: query.elapsedClassName }, [
								el("span", query.formatElapsed),
								el(".popover.left", [
									el(".popover-content", query.query),
									el(".arrow"),
								])
							])
						)}))
					))
				)}))
			])
		])
	)}
}

/*
// naive implementation w/ array flattening
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

/*
var el = domvm.defineElementSpread;

// FIXED_BODY optimization for fixed-layout nodes (no removal/insertion/reordering)
el = function() {
	var vnode = domvm.defineElementSpread.apply(null, arguments);
	vnode.flags = domvm.FIXED_BODY;
	return vnode;
};

// uses spread w/ array flattening
function DBMonView() {
	return (vm, dbs) =>
		el("div",
			el("table.table.table-striped.latest-data",
				el("tbody", dbs.map(db =>
					el("tr",
						el("td.dbname", db.dbname),
						el("td.query-count",
							el("span", { class: db.lastSample.countClassName }, db.lastSample.nbQueries)
						), db.lastSample.topFiveQueries.map(query =>
						el("td", { class: query.elapsedClassName },
							el("span", query.formatElapsed),
							el(".popover.left",
								el(".popover-content", query.query),
								el(".arrow")
							)
						))
					)
				))
			)
		)
}
*/

var dbs		= null,
	raf		= null,
	vm		= null,
	init	= true,
	avg		= [],
	len		= 5,
	start;

function mount(appEl, dbs) {
	vm = domvm.createView(DBMonView, dbs);
	vm.mount(appEl);
}

function attach(appEl, dbs) {
	// isomorphic test
	var vw0 = domvm.createView(DBMonView, dbs);
	appEl.innerHTML = vw0.html();

	vm = domvm.createView(DBMonView, dbs);
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

//step();