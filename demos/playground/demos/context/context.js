domvm.VNode.prototype.pull = function(key) {
	var node = this;

	// walk up the vtree, searching any data on vnodes & vms
	while (node != null) {
		var vm = node.vm;
		var data = vm != null ? vm.data : node.data;

		if (data != null && key in data)
			return data[key];

		node = node.parent;
	}
};

const el = domvm.defineElement;
const vw = domvm.defineView;
const cv = domvm.createView;

function App() {
	return () =>
		el("div", [
			vw(Header)
		]);

}

function Header() {
	return () =>
		el("div", [
			vw(UserInfo)
		]);
}

function UserInfo(vm) {
	return (vm, data, key, newPar) => {
		return el("strong", newPar.pull("user").name);
	}
}

const data = {
	user: {
		name: "Leon",
	}
};

cv(App, data).mount(document.body);