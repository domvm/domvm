var domvm = require("../index.js");

function View() {
	return () => [".foo", {class: 'baz'}, "bar"];
}

var vm = domvm.view(View);

var html = domvm.html(vm);

console.log(html);