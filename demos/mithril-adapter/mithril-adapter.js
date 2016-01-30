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
// we'll also mimic Mithril by returning an m.prop that gets set
// on promise resolution with an initial value set, since domvm
// render is not blocked by pending promises/async
m.request = function(opts) {
	var p = m.prop(opts.initialValue);
	var meth = opts.method.toLowerCase();
	w[meth](opts.url, p);
	return p;
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