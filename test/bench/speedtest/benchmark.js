(function(){
	function Benchmark() {}

	Benchmark.circles = 100; // Change N to change the number of drawn circles.

	var timeout = null;
	var totalTime = null;
	var loopCount = null;
	var startDate = null;

	Benchmark.reset = function() {
		clearTimeout(timeout);
//		cancelAnimationFrame(timeout);
		document.getElementById('grid').innerHTML = '';
		document.getElementById('timing').innerHTML = '&nbsp;';
	};

	Benchmark.loop = function(fn) {
		loopCount = 0;
		totalTime = 0;
		startDate = Date.now();
		Benchmark._loop(fn);
	};

	Benchmark._loop = function(fn) {
		totalTime += Date.now() - startDate;
		startDate = Date.now();
		fn();
		loopCount++;
		if (loopCount % 20 === 0)
			document.getElementById("timing").textContent = 'Performed ' + loopCount + ' iterations in ' + totalTime + ' ms (average ' + (totalTime / loopCount).toFixed(2) + ' ms per loop).';
//		timeout = requestAnimationFrame(function()	{ Benchmark._loop(fn) });
		timeout = setTimeout(function()	{ Benchmark._loop(fn) }, 0);
	};

	window.benchmark = Benchmark;
})();