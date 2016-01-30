// hyperscript wrapper, since domvm templates are JSONML
function m() {
	return Array.prototype.slice.call(arguments);
}

// mutation observer context for auto-redraw
var w = domvm.watch();

// m.prop
m.prop = w.prop;

// m.withAttr
m.withAttr = w.sync;

// domvm.watch has method-specific fetch funcs w.get(), w.post()
// this wrapper only handles methods with no request body
m.request = function(opts) {
	var meth = opts.method.toLowerCase();
	return w[meth](opts.url, m.prop(opts.initialValue));
};

// component mounter
m.mount = function(elem, comp) {
	// view constructor / component whatever
	function View(vm, model, key, impCtx) {
		return comp.view;
	};

	// run "init" / create state / instance / whatever
	// imported context is passed into .render(impCtx) on each
	// redraw while models are only passed once into the view constructor
	var impCtx = comp.controller();

	var opts = {
	//	import the observer context with which to auto-wrap ev handlers and promises
		watch: w,
	//	decide what context you want for event handlers, Mithril uses the controller.
	//	technically this doesnt need to be set explicitly, since order of precedence is
	//	opts.evctx || model || impCtx || null
		evctx: impCtx,
	};

	// add a handler that'll trigger redraw
	w.on(function(e) {
		compVm.redraw();
	});

	var compVm = domvm.view(View, null, null, impCtx, opts).mount(elem);
};