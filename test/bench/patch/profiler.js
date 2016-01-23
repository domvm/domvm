var profiler = {};
/**
 * @const {number}
 */
profiler.MAX_SAMPLES = 200;

/**
 *
 * @const {!Object<string, !profiler.Widget>}
 */
profiler.instances = {};

/**
 * Profiler Widget
 *
 * @param {string} name
 * @constructor
 * @struct
 * @final
 */
profiler.Widget = function(name) {
  this.name = name;
  /** @type {!Array<number>} */
  this.samples = [];

  this.element = document.createElement('div');
  this.element.style.cssText = 'padding: 2px; background-color: #020';
  this.label = document.createElement('div');
  this.label.style.cssText = 'text-align: center; font-size: 12px; color: #0f0';
  this.label.textContent = this.name;
  this.text = document.createElement('div');
  this.text.style.cssText = 'font-size: 12px; color: #0f0';
  this.canvas = /** @type {!HTMLCanvasElement} */(document.createElement('canvas'));
  this.canvas.style.cssText = 'display: block; padding: 0; margin: 0';
  this.canvas.width = profiler.Widget.WIDTH;
  this.canvas.height = profiler.Widget.HEIGHT;

  this.element.appendChild(this.label);
  this.element.appendChild(this.text);
  this.element.appendChild(this.canvas);
  this.ctx = /** @type {!CanvasRenderingContext2D} */(this.canvas.getContext('2d'));
};

profiler.Widget.HEIGHT = 100;
profiler.Widget.WIDTH = profiler.MAX_SAMPLES;

profiler.Widget.prototype.update = function() {
  var min = Math.min.apply(Math, this.samples);
  var max = Math.max.apply(Math, this.samples);
  var now = this.samples[this.samples.length - 1];
  var scale = profiler.Widget.HEIGHT / max;

  this.text.innerHTML = `<div>min: ${min.toFixed(3)}ms</div><div>max: ${max.toFixed(3)}ms</div><div>now: ${now.toFixed(3)}ms</div>`;

  this.ctx.fillStyle = '#010';
  this.ctx.fillRect(0, 0, profiler.Widget.WIDTH, profiler.Widget.HEIGHT);

  this.ctx.fillStyle = '#0f0';
  for (var i = 0; i < this.samples.length; i++) {
    this.ctx.fillRect(i, profiler.Widget.HEIGHT, 1, -(this.samples[i] * scale));
  }
};

/**
 * Initialize profiler and insert it into container.
 *
 * @param {string} name
 * @param {!Element} container
 */
profiler.init = function(name, container) {
  var w = new profiler.Widget(name);
  profiler.instances[name] = w;
  container.appendChild(w.element);
};

/**
 * Measure time.
 *
 * @param {string} name
 * @param {!Function} fn
 */
profiler.measure = function(name, fn) {
  var w = profiler.instances[name];

  var t = window.performance.now();
  fn();
  w.samples.push(window.performance.now() - t);
  if (w.samples.length > profiler.MAX_SAMPLES) {
    w.samples.shift();
  }
  w.update();
};
