class View {
	constructor(model, key, opts) {
		domvm.ViewModel.call(this, this.constructor, model, key, opts);
	}
}

const p = domvm.ViewModel.prototype;

for (var i in p)
	View.prototype[i] = p[i];

View.prototype._isClass = true;