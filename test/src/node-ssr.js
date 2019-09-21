var domvm = require("../../dist/full/domvm.full.cjs.js");

var el = domvm.defineElement;

function View() {
	return () => el(".foo", {class: 'baz'}, "bar");
}

var vm = domvm.createView(View);

console.log(vm.html());