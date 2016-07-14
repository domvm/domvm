var domvm = require("../index.js");

function View() {
	return () => [".foo", {class: 'baz'}, "bar"];
}

var vm = domvm.view(View).mount();

var html = domvm.html(vm.node);

console.log(html);