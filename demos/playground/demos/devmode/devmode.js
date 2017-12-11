//	domvm.DEVMODE.mutations = false;
//	domvm.DEVMODE.warnings = false;
//	domvm.DEVMODE.verbose = false;

var el = domvm.defineElement,
	vw = domvm.defineView,
	iv = domvm.injectView,
	sv = domvm.defineSvgElement;

var subView3 = true;

var subView5 = false;

function View(vm) {
	function onclick() { var x = 1; }

	var attrs = {
		type: "text",
		value: "moo",
	};

	return function() {
		return el("div", [
			el("input"),
			el("input[name=x]"),
			el("textarea"),
			el("select"),
			el("keygen"),
			el("datalist"),
			el("output"),
			el("div", {onmousedown: function() {}}, "Click me!"),
			el("div", {onclick: onclick}, "Click me 2!"),
			el("div", {onclick: subView3 ? onclick : [onclick]}, "Click me 3!"),
			el("svg"),
			sv("svg"),
			vw(View2, {}),
			vw(View2, {}, 'mooKey'),
			subView3 ? vw(View3) : null,
			vw(View4, {}),
			el("div", attrs),
			[
				el("div"),
				"abc",
				"def",
			],
			subView5 && iv(vm5)
		]);
	}
}

function View2() {
	return function() {
		return el("strong", "View2");
	}
}

function View3(vm) {
	setTimeout(function() {
		subView3 = false;
		subView5 = true;
		vm.root().redraw();
		vm.redraw();
	}, 500);

	return function() {
		return el("em", "View3");
	}
}

function View4(vm, data) {
	return function() {
		return el("em", "View4");
	}
}

function View5(vm, data) {
	return function() {
		return el("em", "View5");
	}
}

function View6(vm, data) {
	return function() {
		return el("table#table", [
			el("tr", [
				el("td", "foo"),
				el("td", "bar"),
			])
		]);
	}
}

var vm5 = domvm.createView(View5);
vm5.redraw();

var vm = domvm.createView(View).mount(document.body);

var myDiv = document.createElement("div");

document.body.lastChild.appendChild(myDiv);

var vm2 = domvm.createView(View6);
vm2.attach(document.getElementById("table"));