domvm.cfg({
	stream: {
		val: function(v, accum) {
			if (flyd.isStream(v)) {
				accum.push(v);
				return v();
			}
			else
				return v;
		},
		on: function(accum, vm) {
			let calls = 0;

			const s = flyd.combine(function() {
				if (++calls == 2) {
					vm.redraw();
					s.end(true);
				}
			}, accum);

			return s;
		},
		off: function(s) {
			s.end(true);
		}
	}
});

var el = domvm.defineElement;

function randColor() {
	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

function View1(vm, pers) {
	return function() {
		return el("div", pers.age);
	}
}

function View2(vm, pers) {
	return function() {
		return el("strong", pers.age);
	}
}

function View3(vm, pers) {
	return function() {
		return el("#square", {style: {background: pers.background}}, pers.age);
	}
}

function View4(vm, pers) {
	return function() {
		return el("#style", {style: pers.style}, pers.age);
	}
}

function View5(vm, pers) {
	return function() {
		return el("input", {disabled: pers.disabled, placeholder: pers.disabled() ? "Disabled" : null}, pers.age);
	}
}

function View6(vm, pers) {
	function incrAge(e) {
		pers.age(pers.age() + 1)
	}

	return function() {
		return el("button", {onclick: incrAge}, "Age += 1");
	}
}

function View7(vm, pers) {
	return function() {
		return el("button", {onclick: [pers.age, 100]}, "Age = 100");
	}
}

// todo: the dependent vm._stream discards returned data
function View8(vm, stream) {
	return function() {
		return el("#data-stream", stream().qty);
	}
}

function genStyle(p) {
	return {
		background: p.background(),
		border: "3px solid " + randColor(),
	};
}

var pers = {
	age: flyd.stream(0),
	background: flyd.stream(randColor()),
	style: flyd.stream(),
	disabled: flyd.stream(false),
};

pers.style(genStyle(pers));

domvm.createView(View1, pers).mount(document.body);
domvm.createView(View2, pers).mount(document.body);
domvm.createView(View3, pers).mount(document.body);
domvm.createView(View5, pers).mount(document.body);
domvm.createView(View4, pers).mount(document.body);
domvm.createView(View6, pers).mount(document.body);
domvm.createView(View7, pers).mount(document.body);

var stream8 = flyd.stream({qty: 0});
domvm.createView(View8, stream8).mount(document.body);

var factor = 1;

setInterval(function() {
	pers.age(pers.age() + 1);
}, factor * 1000);

setInterval(function() {
	pers.background(randColor());
}, factor * 1500);

setInterval(function() {
	pers.style(genStyle(pers));
}, factor * 500);

setInterval(function() {
	pers.disabled(!pers.disabled());
}, factor * 250);

setInterval(function() {
	stream8({qty: stream8().qty + 1});
}, factor * 100);