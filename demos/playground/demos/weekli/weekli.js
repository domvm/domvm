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
		return selected[key];
	}

	// let's expose the api :)
	vm.api = {
		toggleDay: toggleDay,
		toggleHour: toggleHour,
		setDayHour: setDayHour,
	};

	// delegated handlers for template
	var paintWith = false;
	var mouseIsDown = false;

	function setMouseDown() {
		mouseIsDown = true;
	}

	function setMouseUp() {
		mouseIsDown = false;
	}

	function downDayHour(day, hour) {
		paintWith = setDayHour(day, hour);
	}

	function overDayHour(day, hour) {
		mouseIsDown && setDayHour(day, hour, paintWith);
	}

	// template
	return function() {
		return el("table", {onmousedown: setMouseDown, onmouseup: setMouseUp}, [
			el("tr", [
				el("th"),
				days.map(function(day, i) {
					return el("th.day", {onmousedown: [toggleDay, i]}, day);
				})
			]),
			hours.map(function(hour) {
				return el("tr", [
					el("th.hour", {onmousedown: [toggleHour, hour]}, hourRange(hour)),
					days.map(function(day, i) {
						var key = i + ":" + hour;
						return el("td.dayhour", {
							class: selected[key] ? "sel" : null,
							onmousedown: [downDayHour, i, hour],
							onmouseover: [overDayHour, i, hour],
						});
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