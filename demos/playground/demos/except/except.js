var el = domvm.defineElement;
var vw = domvm.defineView;

function B() {
	alert(something);

	return function() {
		alert(otherThing);
	};
}

const C = {
	init() {
		alert(something);
	},
	render() {
		alert(otherThing);
	},
}

function A() {
	return function() {
		return el("div", [
			vw(B),
			vw(C),
			"A",
		]);
	};
}

domvm.createView(A).mount(document.body);