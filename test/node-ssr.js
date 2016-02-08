var domvm = require("../index.js");

function View() {
	return () => [".foo", "bar"];
}

var vm = domvm.view(View);

var html = domvm.html(vm.node);

console.log(html);