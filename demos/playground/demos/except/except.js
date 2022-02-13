var el = domvm.defineElement;
var vw = domvm.defineView;

function B() {
	console.log(createB);

	return function() {
		console.log(renderB);

		return el("div", "renderB");
	};
}

const C = {
	init() {
	//	console.log(initC);
	},
	render() {
		console.log(renderC);

		return el("div", "renderC");
	},
}

function A() {
	return function() {
		return el("div", [
			vw(B),
			vw(C),
			"renderA",
		]);
	};
}

domvm.createView(A).mount(document.body);