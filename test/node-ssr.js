var domvm = require("../dist/domvm.js");

var el = domvm.view.defineElement;

function View() {
	return () => el(".foo", {class: 'baz'}, "bar");
}

var vm = domvm.view.createView(View);

console.log(vm.html());