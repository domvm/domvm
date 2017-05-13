export const DEVMODE = {
	enabled: true,

	verbose: true,

	AUTOKEYED_VIEW: function(vm, model) {
		var msg = "A view has been auto-keyed by a provided model's identity: If this model is replaced between redraws,"
		+ " this view will unmount, its internal state and DOM will be destroyed and recreated."
		+ " Consider providing a fixed key to this view to ensure its persistence & fast DOM recycling.";

		return [msg, vm, model];
	},

	UNKEYED_INPUT: function(vnode) {
		return ["Unkeyed <input>: Consider adding a name, id, _key, or _ref attr to avoid accidental DOM recycling between different <input> types.", vnode];
	},

	UNMOUNTED_REDRAW: function(vm) {
		return ["Cannot manually .redraw() an unmounted view!", vm];
	},

	INLINE_HANDLER: function(vnode, oval, nval) {
		return ["Anonymous event handlers get re-bound on each redraw, consider defining them outside of templates for better reuse.", vnode, oval, nval];
	},

	MISMATCHED_HANDLER: function(vnode, oval, nval) {
		return ["Unable to patch differing event handler definition styles.", vnode, oval, nval];
	},

	SVG_WRONG_FACTORY: function(vnode) {
		return ["<svg> defined using domvm.defineElement: Use domvm.defineSvgElement for <svg> & child nodes", vnode];
	},
}

export function devNotify(key, args) {
	if (DEVMODE.enabled) {
		var msgArgs = DEVMODE[key].apply(null, args);

		if (msgArgs) {
			msgArgs[0] = key + ": " + (DEVMODE.verbose ? msgArgs[0] : "");
			console.warn.apply(null, msgArgs);
		}
	}
}