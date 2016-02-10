(function(global){

global.model = {};

model.Todo = function(obj) {
    this.id = '' + Date.now() + String(Math.random()).substr(2, 10);
    this.title = obj.title;
    this.completed = false;
}

model.Todos = {

    id: 'todos-domvm',

    store: [],

    add: function(obj) {
        this.store.push(new model.Todo(obj));
        this.save();
    },

    destroy: function(id) {
        var i, store = this.all();

        if (typeof id === 'undefined') {
            this.store = [];
        }

        for (var i = 0; i < store.length; i++) {
            if (store[i].id === id) {
                store.splice(i, 1);
                break;
            }
        }

        this.save();
    },

    destroyCompleted: function() {
        var store = this.all();
        for (var i = 0; i < store.length; i++) {
            if (store[i].completed) {
                store.splice(i, 1);
                i--;
            }
        }

        this.save();
    },

    complete: function(todo, completed) {
        todo.completed = completed;
        this.save();
    },

    completeAll: function(completed) {
        this.all().forEach(function(todo){
            todo.completed = completed;
        })
        this.save();
    },

    count: function() {
        return this.all().length;
    },

    remaining: function() {
        return this.all().reduce(function(result, todo){
            return todo.completed
                ? result
                : result + 1;
        }, 0);
    },

    findActive: function() {
        return this.all().filter(function(item){
            return !item.completed;
        })
    },

    findCompleted: function() {
        return this.store.filter(function(item){
            return item.completed;
        })
    },

    all: function() {
        if (! this.store.length) {
            this.store = this.recover();
        }
        return this.store;
    },

    recover: function() {
        return JSON.parse(localStorage.getItem(this.id) || '[]');
    },

    save: function() {
        var id      = this.id,
            content = JSON.stringify(this.store);
        setTimeout(function(){ localStorage.setItem(id, content) })
    }
};

})(this);
