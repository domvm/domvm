// init our model/state/api
var app = new TodoApp();

// set up routes
var route = Rlite(notFound, {
	"":				function() { window.location.replace("#all"); },
	"all":			function() { app.setFilter("all"); },
	"active":		function() { app.setFilter("active"); },
	"completed":	function() { app.setFilter("completed"); },
});

function notFound() {}

function routeHash() {
	route((location.hash || "#").slice(1));

	if (app.view.node == null)
		app.view.mount(document.querySelector(".todoapp"), true);
}

window.addEventListener("hashchange", routeHash);

routeHash();