var el = domvm.defineElement;						// element VNode creator

function StepperView(vm, stepper) {					// view closure (called once during init)
	function add(num) {
		stepper.value += num;
		vm.redraw();
	}

	function set(e) {
		stepper.value = +e.target.value;
	}

	return function() {								// template renderer (called on each redraw)
		return el("#stepper", [
			el("button", {onclick: [add, -1]}, "-"),
			el("input[type=number]", {value: stepper.value, oninput: set}),
			el("button", {onclick: [add, +1]}, "+"),
		]);
	};
}

var stepper = {										// some external model/data/state
	value: 1
};

var vm = domvm.createView(StepperView, stepper);	// create ViewModel, passing model

vm.mount(document.body);							// mount into document