// hyperscript wrapper, since domvm templates are JSONML
function m() {
	return Array.prototype.slice.call(arguments);
}

// mutation observer context for auto-redraw
var w = domvm.watch();

// m.prop
m.prop = w.prop;

// domvm.watch has method-specific fetch funcs w.get(), w.post()
// this wrapper only handles methods with no request body
m.request = function(opts) {
	var meth = opts.method.toLowerCase();
	return m.prop(opts.initialValue, w[meth](opts.url));
};

// component mounter
m.mount = function(elem, comp) {
	// view constructor / component whatever
	function View(vm) {
		return comp.view;
	};

	// run "init" / create state / model instance / whatever
	var model = comp.controller();

	var opts = {
	//	import the observer context with which to auto-wrap ev handlers and promises
		watch: w,
	//	decide what context you want for event handlers, Mithril uses the controller.
	//	technically this doesnt need to be set explicitly, since order of precedence is
	//	opts.evctx || model || impCtx || null
		evctx: model,
	};

	// add a handler that'll trigger redraw
	w.on(function(e) {
		compVm.redraw();
	});

	var compVm = domvm.view(View, model, null, null, opts).mount(elem);
};