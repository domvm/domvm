var el = domvm.defineElement;

function View(vm) {
	return {
		diff: {
			val: (vm, data) => data.idle,
			eq: (vm, oldIdle, newIdle) => {
				if (oldIdle != newIdle) {
					vm.node.patch(
						newIdle ?
						{class: "yyy", style: "display: none;"} :
						{class: "xxx", style: null}
					);
				}

				return true;
			},
		},
		render: function(vm, data) {
			return el(".moo", "HI");
		}
	};
}

var vm = domvm.createView(View, {idle: false}).mount(document.body);

setTimeout(function() {
	vm.update({idle: true});
}, 1000);

setTimeout(function() {
	vm.update({idle: false});
}, 3000);