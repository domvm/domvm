var el = domvm.defineElement;

function StepperView(vm, stepper) {
	var add = stepper.add.bind(stepper);

	function sync(e) {
		stepper.set(e.target.value);
	}

	return function() {
		return el("#stepper", [
			el("button", {onclick: [add, -1]}, "-"),
			el("input[type=number]", {value: stepper.value, oninput: sync}),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

function Stepper() {
	this.value = 1;

	this.add = function(num) {
		this.value += num;
		this.view.redraw();
	};

	this.set = function(num) {
		this.value = +num;
		this.view.redraw();
	};

	this.view = domvm.createView(StepperView, this);
}

var stepper = new Stepper();

stepper.view.mount(document.body);

var i = 0;
var it = setInterval(function() {
	stepper.add(1);

	if (i++ == 20)
		clearInterval(it);
}, 250)