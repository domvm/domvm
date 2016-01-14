(function(){
	domvm.useRaf = false;

	var count = 0;

	function View(refresh, refs, emit) {
		return {
			render: function() {
				var circles = [];
				for (var i = 0 ; i < benchmark.circles; i++) {
					circles.push(
						["div", {"class": "box-view"}, [
							["div", {"class": "box", style: getStyle() }, count % 100]
						]]
					);
				}
				return ["div", circles];
			}
		}

		function getStyle() {
			return {
				top: (Math.sin(count / 10) * 10),
				left: (Math.cos(count / 10) * 10),
				background: "rgb(0,0," + (count % 255) +")"
			};
		}
	}

	window.runDomvm = function() {
		benchmark.reset();

		var v = domvm(View);
		v.mount(document.getElementById("grid"));

		benchmark.loop(function() {
		  count++;
		  v.redraw();
		});
	};
})();