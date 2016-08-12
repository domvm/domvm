(function(global){

function Router() {
    return {
        all: {
            path: 'all',
            onenter: function() {
                model.Todos.currentFilter = 'all';
                appView.redraw();
            }
        },

        active: {
            path: 'active',
            onenter: function() {
                model.Todos.currentFilter = 'active';
                appView.redraw();
            }
        },

        completed: {
            path: 'completed',
            onenter: function() {
                model.Todos.currentFilter = 'completed';
                appView.redraw();
            }
        }
    }
}

var router  = domvm.route(Router),
    appView = domvm.view(view.App, model.Todos);

if (router.route().href = '/') {
    // go to `all` route if no route is provided
    appView.mount(document.querySelector('.todoapp'));
    router.goto('all');
} else {
    // if a valid route is provided
    // mount the view first, then refresh the router
    // because each route handler *set the filter up* and redraw app view
    appView.mount(document.querySelector('.todoapp'));
    router.refresh();
}

})(this)