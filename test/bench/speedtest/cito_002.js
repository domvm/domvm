(function(){

  function Animation() {
    this.count = 0;
  }

  Animation.prototype.getStyle = function() {
    return {
      top: (Math.sin(this.count / 10) * 10) + "px",
      left: (Math.cos(this.count / 10) * 10) + "px",
      background: "rgb(0,0," + (this.count % 255) +")"
    };
  }

  Animation.prototype.createCircles = function() {
    var circles = [];
    for(var i = 0 ; i < benchmark.circles; i++) {
      circles.push({
        tag: 'div', attrs: {"class": "box-view"}, children: [{
          tag: "div", attrs: {"class": "box", style: this.getStyle()}, children: (this.count % 100) + ''
        }]
      })
    }
    return circles;
  }

  Animation.prototype.render = function() {
    return { tag: "div", children: this.createCircles() }; // cito require a unique root element
  }

  window.runCito = function() {
    benchmark.reset();

    var grid = document.getElementById('grid');
    var animation = new Animation();

    var element = cito.vdom.append(grid, animation.render());

//	var instr = new DOMInstr(true);
//	instr.start();

    benchmark.loop(function() {
      animation.count++;
      cito.vdom.update(element, animation.render());
//	  if (animation.count == 1)
//		  console.log(instr.end());
    });
  };

})();