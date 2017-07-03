var el = domvm.defineElement;

function CalendarView(vm, args) {
	var months = [
			"January", "February", "March",
			"April", "May", "June",
			"July", "August", "September",
			"October", "November", "December"
		],
		wkdays = [
			"Sunday", "Monday",
			"Tuesday", "Wednesday",
			"Thursday", "Friday",
			"Saturday"
		],
		cols = 7,
		rows = 6,
		wkStart = 1;		// week start

	for (var i = 0; i < wkStart; i++)
		wkdays.push(wkdays.shift());

	// expose UI some of component's API and state
	var api = vm.api = {
		selected: {},
		selectDate: function(date) {
			api.selected[date] = !api.selected[date];
			vm.redraw();
		},
		loadYear: function(year) {
			args.year = year;
			vm.redraw();
		},
	};

	function daysInMonth(year, month) {
	   return new Date(year, month + 1, 0).getDate();
	}

	function firstDayOfMonth(year, month) {
		return new Date(year, month).getDay();
	}

	function range(n) {
		var arr = Array(n);
		for (var i = 0; i < n;)
			arr[i] = i++;
		return arr;
	}

	// sub-render
	function rendMonth(year, month) {
		var prevEnd = daysInMonth(year, month - 1),
			start = firstDayOfMonth(year, month),
			end = daysInMonth(year, month),
			// if start of month day < start of week cfg, roll back 1 wk
			wkOffs = start < wkStart ? -7 : 0;

		return el("table.month", [
			el("caption", months[month]),
			el("tr", wkdays.map(function(day) {
				return el("th", day.substr(0,3));
			})),
			range(rows).map(function(r) {
				return el("tr.week", range(cols).map(function(c) {
					var idx = (r * cols + c) + wkOffs + wkStart,
						off = idx - start + 1,
						date = year+"-"+month+"-"+off,
						cellClass = (idx < start || off > end ? ".dim" : "") + (!!api.selected[date] ? ".sel" : ""),
						cellText = idx < start ? prevEnd + off : off > end ? off - end : off;

					return el("td.day" + cellClass, {_data: date}, cellText);
				}));
			})
		]);
	}

	// top-level render
	function rendYear(vm, args) {
		var prevYear = args.year - 1,
			nextYear = args.year + 1;

		return el(".year", {onclick: {".day": function(e, node) { api.selectDate(node.data); }}}, [
			el("header", [
				el("button.prev", {onclick: [api.loadYear, prevYear]}, "< " + prevYear),
				el("strong", {style: {fontSize: "18pt"}}, args.year),
				el("button.next", {onclick: [api.loadYear, nextYear]}, nextYear + " >"),
			]),
			range(12).map(function(month) {
				return rendMonth(args.year, month);
			}),
		]);
	}

	return rendYear;
}

domvm.createView(CalendarView, {year: new Date().getFullYear()}).mount(document.body);