QUnit.module("Attrs/props");

(function() {
	function View() {
		return function() { return tpl; }
	}

	var vm, tpl;

	// todo dataMoo or deep ".dataset.*" .value? console.log(vm.node.el.onclick._fn);
	QUnit.test("Create", function(assert) {
		var onclick = function() {};
		tpl = el("input#foo.bar.baz", {type: "text", style: {fontFamily: "Arial", fontSize: 12}, disabled: true, custom: "abc", custom2: null, custom3: "", custom4: "foo", onclick: onclick});

		instr.start();
		vm = domvm.createView(View).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var expcHtml = '<input type="text" disabled="" custom="abc" custom3="" custom4="foo" id="foo" class="bar baz" style="font-family: Arial; font-size: 12px;">';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { id: 1, className: 1, createElement: 1, insertBefore: 1, setAttribute: 4 });
	});

	// TODO: can 'id' or 'name' be allowed to change for recycling since they implicitly double as keys?
	// TODO: can any form elements be reused if non-matching type?
	QUnit.test("Update", function(assert) {
		var onclick = function() {};
		tpl = el("input#foo", {type: "text", style: {padding: 10}, disabled: false, custom: "xyz", custom2: "...", custom4: null});

		instr.start();
		vm.redraw();		// todo: create test container
		var callCounts = instr.end();
/*
		// a bit of a hack to get the outerHtml to match exactly fo the test
		// domvm sets className="" for perf rather than removeAttribute("class")
		if (vm.node.el.className === "")
			vm.node.el.removeAttribute("class");
*/
		var expcHtml = '<input type="text" custom="xyz" custom2="..." id="foo" style="padding: 10px;">';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeAttribute: 3, setAttribute: 2 });
	});


	// a checkbox component
	function Check(id, checked) {
		this.id = id;
		this.checked = checked;

	//	this.view = [CheckView, this];
	}

	function CheckView(vm, check) {
		check.vm = vm;
		return function() {
			return el("input#" + check.id, {type: "checkbox", checked: check.checked});
		};
	};

	var check1 = new Check("check1", false);
	var check2 = new Check("check2", true);
	var check3 = new Check("check3", true);

	QUnit.test("Bool attr init false", function(assert) {
		instr.start();
		domvm.createView(CheckView, check1).mount(testyDiv);		// todo: create test container
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, check1.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Bool attr toggle true", function(assert) {
		check1.checked = true;

		instr.start();
		check1.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check1.id);

		var expcHtml = '<input type="checkbox" id="check1">';
		evalOut(assert, checkEl, check1.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr init true", function(assert) {
		instr.start();
		domvm.createView(CheckView, check2).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, check2.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1, checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Bool attr toggle false", function(assert) {
		check2.checked = false;

		instr.start();
		check2.vm.redraw();
		var callCounts = instr.end();

		var checkEl = document.getElementById(check2.id);

		var expcHtml = '<input type="checkbox" id="check2">';
		evalOut(assert, checkEl, check2.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: false});
	});

	QUnit.test("Dynamic props, always sync vtree -> DOM prop", function(assert) {
		instr.start();
		domvm.createView(CheckView, check3).mount(testyDiv);
		var callCounts = instr.end();

		var checkEl = document.getElementById(check3.id);

		var expcHtml = '<input type="checkbox" id="check3">';
		evalOut(assert, checkEl, check3.vm.html(false), expcHtml, callCounts, { id: 1, createElement: 1, insertBefore: 1, setAttribute: 1, checked: 1 }, {checked: checkEl.checked}, {checked: true});

		// user interaction
		check3.vm.node.el.checked = false;

		// redraw with model.checked still true
		instr.start();
		check3.vm.redraw();
		var callCounts = instr.end();

		// the visual state should be reset back to the model state
		var expcHtml = '<input type="checkbox" id="check3">';
		evalOut(assert, checkEl, check3.vm.html(false), expcHtml, callCounts, { checked: 1 }, {checked: checkEl.checked}, {checked: true});
	});

	QUnit.test("Dynamic props, always unset if absent after recycle", function(assert) {
		var tpl = null;

		function View() {
			return function() {
				return tpl;
			}
		}

		var a, b, c, d, e, f;

		tpl = el("div", [
			a = el("input[type=checkbox]", {checked: true}),
			b = el("input[type=checkbox]"),
			c = el("input[type=text]", {value: "abc"}),
			d = el("input[type=text]"),
		]);
		var expcHtml = '<div><input type="checkbox"><input type="checkbox"><input type="text"><input type="text"></div>';

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(false), expcHtml, callCounts, { createElement: 5, insertBefore: 5, setAttribute: 4, checked: 1, value: 1 });
		assert.equal(a.el.checked, true, "a.checked == true");
		assert.equal(c.el.value, "abc", "c.value == 'abc'");

		tpl = el("div", [
			e = el("input[type=checkbox]"),
			f = el("input[type=text]"),
		]);
		var expcHtml = '<div><input type="checkbox"><input type="text"></div>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(false), expcHtml, callCounts, { removeChild: 2, setAttribute: 1, checked: 1 });
		assert.equal(e.el.checked, false, "e.checked == false");
		assert.equal(f.el.value, "", "f.value == ''");
	});
/*
	QUnit.test("Absent/null attrs after recycle", function(assert) {
		var attrs = {};

		function View() {
			return function() {
				return el("div", attrs, "moo");
			}
		}


//		function View2() {
//			return function() {
//				return attrs ? el("div", attrs, "moo") : el("div", "moo");
//			}
//		}


		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div>moo</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, textContent: 1, insertBefore: 1 });

		attrs = null;

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { });

		attrs = {abc: 1};
		var expcHtml = '<div abc="1">moo</div>';

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { setAttribute: 1 });

	});
*/
	// move this to events.js?
	QUnit.test("Absent on* and style attrs after recycle", function(assert) {
		var onclick = function() {};
		var attrs = {style: "color: red;", onclick: onclick};		// TODO: props ".blah"

		function View() {
			return function() {
				return el("div", attrs, "moo");
			}
		}

		instr.start();
		var vm = domvm.createView(View).mount(testyDiv);
		var callCounts = instr.end();

		var expcHtml = '<div style="color: red;">moo</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { createElement: 1, cssText: 1, textContent: 1, insertBefore: 1 });
		assert.equal(typeof vm.node.el.onclick, "function", "onclick set");

		attrs = null;		// or simply {}?

		instr.start();
		vm.redraw();
		var callCounts = instr.end();

		var expcHtml = '<div>moo</div>';
		evalOut(assert, vm.node.el, vm.html(), expcHtml, callCounts, { removeAttribute: 1 });
		assert.equal(vm.node.el.onclick, null, "onclick unset");
	});
})();