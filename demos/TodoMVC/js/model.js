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
        if (typeof id === 'undefined') {
            this.store = [];
        }

        for (var i = 0; i < this.store.length; i++) {
            if (this.store[i].id === id) {
                this.store.splice(i, 1);
                break;
            }
        }

        this.save();
    },

    destroyCompleted: function(){
        for (var i = 0; i < this.store.length; i++) {
            if (this.store[i].completed) {
                this.store.splice(i, 1);
                i--;
            }
        }

        this.save();
    },

    count: function() {
        return this.store.length;
    },

    remaining: function() {
        return this.store.reduce(function(result, todo){
            return todo.completed
                ? result
                : result + 1;
        }, 0);
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
        localStorage.setItem(this.id, JSON.stringify(this.store));
    }
};

})(this);
