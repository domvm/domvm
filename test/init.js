QUnit.config.reorder = false;

domvm.DEVMODE.syncRedraw = true
domvm.DEVMODE.mutations = false
domvm.DEVMODE.warnings = false;
domvm.DEVMODE.verbose = false;

var	el = domvm.defineElement,
	tx = domvm.defineText,
	cm = domvm.defineComment,
	fr = domvm.defineFragment,
	vw = domvm.defineView,
	iv = domvm.injectView,
	ie = domvm.injectElement;

var instr = new DOMInstr();

var testyDiv = document.getElementById("testy");

function evalOut(assert, viewEl, genrHtml, expcHtml, actuCounts, expcCounts, actuProps, expcProps) {
	var wrap = document.createElement("div");
	wrap.innerHTML = expcHtml;

//	console.log(outerHTML(wrap.firstChild).join("\n") + "\n-----\n" + outerHTML(viewEl).join("\n"));

	assert.equal(genrHtml, expcHtml, "vm.html(): " + genrHtml);
	assert.ok(viewEl.isEqualNode(wrap.firstChild), "DOM HTML: " + viewEl.outerHTML);
//	assert.equal(outerHTML(viewEl).join("\n"), outerHTML(wrap.firstChild).join("\n"), "DOM HTML: " + outerHTML(viewEl).join("\n"));
	assert.deepEqual(actuCounts, expcCounts, "DOM Ops: " + JSON.stringify(expcCounts));
	actuProps && assert.deepEqual(actuProps, expcProps, "DOM Props: " + JSON.stringify(expcProps));
}

function anonView(tpl) {
	return function AnonView(vm, model) {
		return function() {
			return tpl;
		};
	}
}

// Fix Function#name on browsers that do not support it (IE):
if (!(function f() {}).name) {
	Object.defineProperty(Function.prototype, 'name', {
		get: function() {
			var name = (this.toString().match(/^function\s*([^\s(]+)/) || [])[1];
			// For better performance only parse once, and then cache the
			// result through a new accessor for repeated access.
			Object.defineProperty(this, 'name', { value: name });
			return name;
		}
	});
}