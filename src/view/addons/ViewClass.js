class View {
	constructor(data, key, opts) {
		domvm.ViewModel.call(this, this.constructor, data, key, opts);
	}
}

const p = domvm.ViewModel.prototype;

for (var i in p)
	View.prototype[i] = p[i];

View.prototype._isClass = true;