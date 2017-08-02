// element VNode creator
var el = domvm.defineElement;

// view closure (called once during init)
function StepperView(vm, stepper) {
	function add(num) {
		stepper.value += num;
		vm.redraw();
	}

	function set(e) {
		stepper.value = +e.target.value;
	}

	// template renderer (called on each redraw)
	return function() {
		return el("#stepper", [
			el("button", {onclick: [add, -1]}, "-"),
			el("input[type=number]", {value: stepper.value, oninput: set}),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

// some external model/data/state
var stepper = {
	value: 1
};

// create ViewModel, passing model
var vm = domvm.createView(StepperView, stepper);

// mount into document
vm.mount(document.body);