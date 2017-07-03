var el = domvm.defineElement;

function CalendarView(vm) {
	var selected = {};

	// fixed settings
	var days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
	var hours = [7,8,9,10,11];

	// helpers
	function hourRange(from) {
		return from + ":00 - " + (from + 1) + ":00";
	}

	function anyHourSelected(day) {
		for (var key in selected) {
			if (selected[key] && +key[0] == day)
				return true;
		}
		return false;
	}

	function anyDaySelected(hour) {
		for (var key in selected) {
			if (selected[key] && +key.split(":")[1] == hour)
				return true;
		}
		return false;
	}

	// internal api
	function toggleDay(i) {
		var val = !anyHourSelected(i);
		hours.forEach(function(hour) {
			setDayHour(i, hour, val);
		});
	}

	function toggleHour(hour) {
		var val = !anyDaySelected(hour);
		days.forEach(function(day, i) {
			setDayHour(i, hour, val);
		});
	}

	function setDayHour(i, hour, val) {
		var key = i + ":" + hour;
		selected[key] = val == null ? !selected[key] : val;
		markMode = +selected[key];
		vm.redraw();						// can micro-optim this via vm.patch, with a bit more effort, meh :\
	}

	// let's expose the api :)
	vm.api = {
		toggleDay: toggleDay,
		toggleHour: toggleHour,
		setDayHour: setDayHour,
	};

	// delegated handlers for template
	var setSelected = false;
	var mouseIsDown = false;

	var onMousedown = {
		"*":		function(e, node) { mouseIsDown = true; },
		".day":		function(e, node) { toggleDay(node.data); },
		".hour":	function(e, node) { toggleHour(node.data); },
		".dayhour":	function(e, node) { setDayHour.apply(null, node.data); setSelected = node.attrs.class.indexOf("sel") == -1; },
	};

	var onMouseup = {
		"*":		function(e, node) { mouseIsDown = false; },
	};

	var onMouseover = {
		".dayhour":	function(e, node) { mouseIsDown && setDayHour.apply(null, node.data.concat(setSelected)); }
	};

	// template
	return function() {
		return el("table", {onmousedown: onMousedown, onmouseup: onMouseup, onmouseover: onMouseover}, [
			el("tr", [
				el("th"),
				days.map(function(day, i) {
					return el("th.day", {_data: i}, day);
				})
			]),
			hours.map(function(hour) {
				return el("tr", [
					el("th.hour", {_data: hour}, hourRange(hour)),
					days.map(function(day, i) {
						var key = i + ":" + hour;
						return el("td.dayhour", {class: selected[key] ? "sel" : null, _data: [i, hour]});
					})
				]);
			})
		]);
	};
}

var calView = domvm.createView(CalendarView).mount(document.body);

/*
function randInt(min,max) {
	return Math.floor(Math.random()*(max-min+1)+min);
}

var count = 4;
var it = setInterval(function() {
	calView.api.setDayHour(randInt(0, 4), randInt(7, 11));
	!count-- && clearInterval(it);
}, 250);
*/