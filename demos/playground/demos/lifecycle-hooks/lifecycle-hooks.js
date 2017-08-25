var el = domvm.defineElement,
	vw = domvm.defineView;

function View1(vm, data) {
	// node-level hooks
	var hooks = {
		willInsert: function(node) {
			node.patch({class: "inserted"});
		},
		didInsert: function(node) {
			node.patch({class: ""});
		},
		willRecycle: function(oldNode, newNode) {
			// DIY diff to detect changes
			if (oldNode.body !== newNode.body) {
				oldNode.patch({class: "reused changed"}, true);
			}
		},
		didRecycle: function(oldNode, newNode) {
			if (oldNode.body !== newNode.body)
				newNode.patch({class: ""});
		},
		willReinsert: function(node) {
			node.patch({class: "moved"});
		},
		didReinsert: function(node) {
			node.patch({class: ""});
		},
		willRemove: function(node) {
			return new Promise(function(resolve, reject) {
				node.patch({class: "removing"}, true);
				node.patch({class: "removed"});
				node.el.addEventListener("transitionend", resolve);
			});
		},
		didRemove: function(node) {},
	};

	return function() {
		return (
			el(".view1", [
				el("ul", data.map(function(word) {
					return el("li", {_hooks: hooks, _key: word.substr(0,1)}, word);
				})),
				vw(View2),
			])
		);
	};
}

function View2(vm) {
	vm.config({hooks: {
		willRedraw:	function() { /*console.log("willRedraw", vm);		*/},
		didRedraw:	function() { /*console.log("didRedraw", vm);		*/},
		willMount:	function() { /*console.log("willMount", vm);		*/},
		didMount:	function() { /*console.log("didMount", vm);			*/},
		willUnmount:function() { /*console.log("willUnmount", vm);		*/},
		didUnmount:	function() { /*console.log("didUnmount", vm);		*/},
	}});

	return function() {
		return el("p.view2", "Hello World");
	};
}

var data = [
	"0.cat",
	"1.dog",
];

var vm = domvm.createView(View1, data);

// view-level hooks
vm.config({hooks: {
	willRedraw: function(vm) {},
	didRedraw: function(vm) {
		vm.node.patch({class: "redrawn"}, true);
		vm.node.patch({class: ""});
	},
	willMount: function(vm) {},
	didMount: function(vm) {
		vm.node.patch({class: "mounted"}, true);
		vm.node.patch({class: ""});
	},
	willUnmount: function(vm) {
		return new Promise(function(resolve, reject) {
			vm.node.patch({class: "unmounting"}, true);
			vm.node.patch({class: "unmounted"});
			node.el.addEventListener("transitionend", resolve);
		});
	},
	didUnmount: function(vm) {},
}});

vm.mount(document.body);

setTimeout(function() {
	data.pop();
	vm.redraw();
}, 1000);

setTimeout(function() {
	data.push("2.foo","3.bar");
	vm.redraw();
}, 2000);

setTimeout(function() {
	data.unshift(data.pop());
	vm.redraw();
}, 3000);

setTimeout(function() {
	data.splice(2, 0, "4.cookie");
	data.splice(0, 1, "5.butter");
	vm.redraw();
}, 4000);

setTimeout(function() {
	data[0] += "-mod";
	data[2] += "-mod";
	vm.redraw();
}, 5000);

/*
setTimeout(function() {
	vm.unmount();
}, 6000);
*/