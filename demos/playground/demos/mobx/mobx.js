var observable = mobx.observable,
	action = mobx.action,
	el = domvm.defineElement,
	vw = domvm.defineView,
	observer = domvm.mobxObserver;  // The domvm-MobX observer() function.

var usersState = observable({
	users: [
		{name: "Dave", car: "BMW"},
		{name: "Johnny", car: false},
		{name: "Sarah", car: "Toyota"},
		{name: "Peter", car: "Volkswagen"},
		{name: "Me", car: "???"},
	],
	// A MobX computed value (automatically caches and recomputes its result):
	get usersWithCar() {
		return this.users.filter(user => user.car !== false);
	},

	// Actions:
	setName: function(i, name) {
		console.log("Set name of user", i, "to:", name);

		this.users[i].name = name;
	},
	setCar: function(i, car) {
		console.log("Set car of user", i, "to:", car);

		this.users[i].car = car;
	},
}, {// Using @action.bound decorator to bind the value of "this":
	setName: action.bound,
	setCar: action.bound,
});

var appState = observable({
	// Set to true to display only users with a car:
	hideNoCar: false,

	// Action:
	toggleHideNoCar: function() {
		console.log("Set hide users without car:", this.hideNoCar);

		this.hideNoCar = !this.hideNoCar;
	},
}, {// Using @action.bound decorator to bind the value of "this":
	toggleHideNoCar: action.bound,
});


var AppView = observer({
	init: function(vm) {
		// To limit the number of displayed users in the user interface.
		// We create a new boxed observable so that render() can react to its changes.
		// The boxed observable is initialized with the value -1:
		vm.limitResults = observable.box(-1);
	},
	toggleLimit: action(function(e, node, vm) {
		var limit = node.el.value;

		console.log("Toggle list limit to:", limit >= 0 ? limit : "no limit");

		vm.limitResults.set(limit);
	}),
	lastUserChange: function(prop, e, node, vm) {
		var val = node.el.value;

		if (prop === "name")
			usersState.setName(4, val);
		else if (prop === "car")
			usersState.setCar(4, val === "" ? false : val);
	},
	render: function(vm) {
		console.log("Render: AppView");

		var users = usersState.users,
			lastUserName = users[users.length - 1].name,
			lastUserCar = users[users.length - 1].car;
		return el("div", [
			"Actions: ",
			el("div.section", [
				"Set first user: name: ",
				el("button", {onclick: [usersState.setName, 0, "Dave"]}, "Dave"),
				el("button", {onclick: [usersState.setName, 0, "Jessica"]}, "Jessica"),
				", car: ",
				el("button", {onclick: [usersState.setCar, 0, "BMW"]}, "BMW"),
				el("button", {onclick: [usersState.setCar, 0, "Ferrari"]}, "Ferrari"),
				el("button", {onclick: [usersState.setCar, 0, false]}, "No car"),
			]),
			el("div.section", [
				"Set last user: ",
				el("label[for=lastUserName]", "name: "),
				el("input[type=text][id=lastUserName]", {
					value: lastUserName,
					onchange: [AppView.lastUserChange, "name"],
					onkeyup: [AppView.lastUserChange, "name"]
				}),
				", ",
				el("label[for=lastUserCar]", "car: "),
				el("input[type=text][id=lastUserCar]", {
					value: lastUserCar === false ? "" : lastUserCar,
					onchange: [AppView.lastUserChange, "car"],
					onkeyup: [AppView.lastUserChange, "car"]
				}),
			]),
			"Display options:",
			el("div.section", [
				el("label[for=hideNoCar]", "Hide users without car: "),
				el("input[type=checkbox][id=hideNoCar]", {
					checked: appState.hideNoCar,
					onchange: [appState.toggleHideNoCar]
				}),
			]),
			el("div.section", [
				el("label[for=limit]", "Limit displayed users: "),
				el("input[type=number][id=limit][min=-1]", {
					value: vm.limitResults.get(),
					onchange: [AppView.toggleLimit]
				}),
			]),
			el("div#listWrapper", [
				"List of users with their cars:",
				vw(UsersListView, {
					state: usersState,  // Don't dereference usersState.users here.
					limitResults: vm.limitResults,  // Don't unbox the value here.
				}),
			]),
		]);
	}
});

var UsersListView = observer(function UsersListView() {
	return function(vm, data) {  // The render() function
		console.log("Render: UsersListView");

		var state = data.state,
			users = appState.hideNoCar ? state.usersWithCar : state.users,
			limitResults = data.limitResults.get();
		if (limitResults >= 0)
			users = users.filter((user, i) => i < limitResults);
		var displayed = users.length,
			total = state.users.length;
		// Because this list is dynamic, we MUST key the views.
		// Here we use the user name which is unique:
		return el("div", [
			el("ul", users.map((user) => vw(UserView, user, user.name))),
			el("div.section", "(Users displayed: " + displayed + "/" + total + ")")
		]);
	};
});

var UserView = observer(function UserView(vm) {
	return {
		render: function(vm, user) {
			console.log("Render: UserView");

			var car = user.car !== false ? "a " + user.car : "no";
			return el("li", "Name: " + user.name + ". Has " + car + " car.");
		}
	};
});



var raf = requestAnimationFrame;

console.log("Action: Mounting AppView...");

var app = domvm.createView(AppView, usersState).mount(document.body);

raf(() => console.log('> First render done. Rendered the "AppView", the "UsersListView" and 5 "UserView".'));

var step = 0;

var interval = setInterval(() => {
	switch (step) {
		case 1:
			console.log("=> Action 1: Changing car of first user to Ferrari...");

			usersState.users[0].car = "Ferrari";

			raf(() => console.log('> Only 1 "UserView" has been re-rendered.'));
			break;
		case 2:
			console.log("=> Action 2: Changing car of last user to none...");

			usersState.users[4].car = false;

			raf(() => console.log('> Only the "AppView" and 1 "UserView" have been re-rendered.'));
			break;
		case 3:
			console.log("=> Action 3: Changing name of first user to Jessica...");

			usersState.users[0].name = "Jessica";

			raf(() => console.log('> Only the "UsersListView" and 1 "UserView" has been re-rendered.'));
			break;
		case 4:
			console.log("=> Action 4: Limiting the number of displayed users to 3...");

			app.limitResults.set(3);

			raf(() => console.log('> Only the "AppView" and the "UsersListView" have been re-rendered.'));
			break;
		case 5:
			console.log("=> Action 5: Removing limit on number of displayed users...");

			app.limitResults.set(-1);

			raf(() => console.log('> Only the "AppView", the "UsersListView" and 2 "UserView" have been re-rendered.'));
			break;
		case 6:
			console.log("=> Action 6: Hide users without car...");

			appState.hideNoCar = true;

			raf(() => console.log('> Only the "AppView" and the "UsersListView" have been re-rendered.'));

			clearInterval(interval);

			raf(() => console.log('=> END'));
			break;
	}
	step++;
}, 800);