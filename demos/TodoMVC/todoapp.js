function TodoApp() {
	var id = 'todos-domvm';

	var view = this.view = domvm.createView(TodoView, this);

	var items = this.items = load();

	function posFromKey(key) {
		for (var i = 0; i < items.length; i++)
			if (items[i].key == key)
				return i;
	}

	function randStr() {
		return Math.random().toString(36).substr(2, 5);
	}

	function sync() {
		view.redraw();
		save();
	}

	function save() {
		localStorage.setItem(id, JSON.stringify(items));
	}

	function load() {
		return JSON.parse(localStorage.getItem(id)) || [];
	}

	this.setFilter = function(filter) {
		view.api.setFilter(filter);
	};

	this.edit = function(key, text) {
		items[posFromKey(key)].text = text;
		sync();
	};

	this.setOne = function(key, done) {
		items[posFromKey(key)].done = done;
		sync();
	};

	this.setAll = function(done) {
		items.forEach(function(item) {
			item.done = done;
		});
		sync();
	};

	this.clearDone = function() {
		var undone = items.filter(item => !item.done);
		items.length = 0;
		items.push.apply(items, undone);
		sync();
	};

	this.add = function(text, done) {
		items.push({ text: text, done: done, key: randStr() });
		sync();
	};

	this.remove = function(key) {
		items.splice(posFromKey(key), 1);
		sync();
	};
}