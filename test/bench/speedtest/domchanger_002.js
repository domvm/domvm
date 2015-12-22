(function(){
	var count = 0;

	function View() {
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
				top: (Math.sin(count / 10) * 10) + "px",
				left: (Math.cos(count / 10) * 10) + "px",
				background: "rgb(0,0," + (count % 255) +")"
			};
		}
	}

	window.runDomchanger = function() {
		benchmark.reset();

		var v = domChanger(View, document.getElementById("grid"));

		benchmark.loop(function() {
		  count++;
		  v.update();
		});
	};
})();