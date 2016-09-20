(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.perfMonitor = global.perfMonitor || {})));
}(this, (function (exports) { 'use strict';

var MonitorMaxSamples = 100;
var MonitorSamplesResult = (function () {
    function MonitorSamplesResult(min, max, mean, last) {
        this.min = min;
        this.max = max;
        this.mean = mean;
        this.last = last;
    }
    return MonitorSamplesResult;
}());
/**
 * Profile Samples.
 */
var MonitorSamples = (function () {
    function MonitorSamples(maxSamples) {
        this.samples = [];
        this.maxSamples = maxSamples;
        this._i = -1;
    }
    MonitorSamples.prototype.addSample = function (v) {
        this._i = (this._i + 1) % this.maxSamples;
        this.samples[this._i] = v;
    };
    MonitorSamples.prototype.each = function (fn) {
        var samples = this.samples;
        for (var i = 0; i < samples.length; i++) {
            fn(samples[(this._i + 1 + i) % samples.length], i);
        }
    };
    MonitorSamples.prototype.calc = function () {
        var samples = this.samples;
        if (samples.length === 0) {
            return new MonitorSamplesResult(0, 0, 0, 0);
        }
        var min = samples[(this._i + 1) % samples.length];
        var max = min;
        var sum = 0;
        for (var i = 0; i < samples.length; i++) {
            var k = samples[(this._i + 1 + i) % samples.length];
            if (k < min) {
                min = k;
            }
            if (k > max) {
                max = k;
            }
            sum += k;
        }
        var last = samples[this._i];
        var mean = sum / samples.length;
        return new MonitorSamplesResult(min, max, mean, last);
    };
    return MonitorSamples;
}());

/**
 * Basic Counter.
 */
var BasicCounter = (function () {
    function BasicCounter() {
        this.value = 0;
        this.onChange = null;
    }
    BasicCounter.prototype.inc = function (value) {
        if (value > 0) {
            this.value += value;
            this.onChange();
        }
    };
    return BasicCounter;
}());
var TimestampedValue = (function () {
    function TimestampedValue(timestamp, value) {
        this.value = value;
        this.next = null;
    }
    return TimestampedValue;
}());
/**
 * Sliding Counter counts how many times `inc` method were called during `interval` period.
 */
var SlidingCounter = (function () {
    function SlidingCounter(interval) {
        var _this = this;
        this._dec = function () {
            var now = performance.now();
            while (_this._firstTimestamp !== null) {
                var nextTimestamp = _this._firstTimestamp;
                if (now >= nextTimestamp.value) {
                    _this.value -= nextTimestamp.value;
                    _this._firstTimestamp = _this._firstTimestamp.next;
                }
                else {
                    setTimeout(_this._dec, Math.ceil(nextTimestamp.value - now));
                    break;
                }
            }
            if (_this._firstTimestamp === null) {
                _this._lastTimestamp = null;
            }
            _this.onChange();
        };
        this.interval = interval;
        this.value = 0;
        this.onChange = null;
        this._firstTimestamp = null;
        this._lastTimestamp = null;
    }
    SlidingCounter.prototype.inc = function (value) {
        if (value > 0) {
            var timestamp = new TimestampedValue(performance.now() + this.interval, value);
            if (this._firstTimestamp === null) {
                this._firstTimestamp = timestamp;
                setTimeout(this._dec, this.interval);
            }
            else {
                this._lastTimestamp.next = timestamp;
            }
            this._lastTimestamp = timestamp;
            this.value += value;
            this.onChange();
        }
    };
    return SlidingCounter;
}());

var frameTasks = [];
var rafId = -1;
/**
 * Schedule new task that will be executed on the next frame.
 */
function scheduleNextFrameTask(task) {
    frameTasks.push(task);
    if (rafId === -1) {
        requestAnimationFrame(function (t) {
            rafId = -1;
            var tasks = frameTasks;
            frameTasks = [];
            for (var i = 0; i < tasks.length; i++) {
                tasks[i]();
            }
        });
    }
}

var __extends = (undefined && undefined.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MonitorGraphHeight = 30;
var MonitorGraphWidth = MonitorMaxSamples;
var Widget = (function () {
    function Widget(name) {
        var _this = this;
        this._sync = function () {
            _this.sync();
            _this._dirty = false;
        };
        this.name = name;
        this.element = document.createElement("div");
        this.element.style.cssText = "padding: 2px;" +
            "background-color: #020;" +
            "font-family: monospace;" +
            "font-size: 12px;" +
            "color: #0f0";
        this._dirty = false;
        this.invalidate();
    }
    Widget.prototype.invalidate = function () {
        if (!this._dirty) {
            this._dirty = true;
            scheduleNextFrameTask(this._sync);
        }
    };
    Widget.prototype.sync = function () {
        throw new Error("sync method not implemented");
    };
    return Widget;
}());
(function (MonitorWidgetFlags) {
    MonitorWidgetFlags[MonitorWidgetFlags["HideMin"] = 1] = "HideMin";
    MonitorWidgetFlags[MonitorWidgetFlags["HideMax"] = 2] = "HideMax";
    MonitorWidgetFlags[MonitorWidgetFlags["HideMean"] = 4] = "HideMean";
    MonitorWidgetFlags[MonitorWidgetFlags["HideLast"] = 8] = "HideLast";
    MonitorWidgetFlags[MonitorWidgetFlags["HideGraph"] = 16] = "HideGraph";
    MonitorWidgetFlags[MonitorWidgetFlags["RoundValues"] = 32] = "RoundValues";
})(exports.MonitorWidgetFlags || (exports.MonitorWidgetFlags = {}));
var MonitorWidget = (function (_super) {
    __extends(MonitorWidget, _super);
    function MonitorWidget(name, flags, unitName, samples) {
        _super.call(this, name);
        this.flags = flags;
        this.unitName = unitName;
        this.samples = samples;
        var label = document.createElement("div");
        label.style.cssText = "text-align: center";
        label.textContent = this.name;
        var text = document.createElement("div");
        if ((flags & exports.MonitorWidgetFlags.HideMin) === 0) {
            this.minText = document.createElement("div");
            text.appendChild(this.minText);
        }
        else {
            this.minText = null;
        }
        if ((flags & exports.MonitorWidgetFlags.HideMax) === 0) {
            this.maxText = document.createElement("div");
            text.appendChild(this.maxText);
        }
        else {
            this.maxText = null;
        }
        if ((flags & exports.MonitorWidgetFlags.HideMean) === 0) {
            this.meanText = document.createElement("div");
            text.appendChild(this.meanText);
        }
        else {
            this.meanText = null;
        }
        if ((flags & exports.MonitorWidgetFlags.HideLast) === 0) {
            this.lastText = document.createElement("div");
            text.appendChild(this.lastText);
        }
        else {
            this.lastText = null;
        }
        this.element.appendChild(label);
        this.element.appendChild(text);
        if ((flags & exports.MonitorWidgetFlags.HideGraph) === 0) {
            this.canvas = document.createElement("canvas");
            this.canvas.style.cssText = "display: block; padding: 0; margin: 0";
            this.canvas.width = MonitorGraphWidth;
            this.canvas.height = MonitorGraphHeight;
            this.ctx = this.canvas.getContext("2d");
            this.element.appendChild(this.canvas);
        }
        else {
            this.canvas = null;
            this.ctx = null;
        }
    }
    MonitorWidget.prototype.sync = function () {
        var _this = this;
        var result = this.samples.calc();
        var scale = MonitorGraphHeight / (result.max * 1.2);
        var min;
        var max;
        var mean;
        var last;
        if ((this.flags & exports.MonitorWidgetFlags.RoundValues) === 0) {
            min = result.min.toFixed(2);
            max = result.max.toFixed(2);
            mean = result.mean.toFixed(2);
            last = result.last.toFixed(2);
        }
        else {
            min = Math.round(result.min).toString();
            max = Math.round(result.max).toString();
            mean = Math.round(result.mean).toString();
            last = Math.round(result.last).toString();
        }
        if (this.minText !== null) {
            this.minText.textContent = "min: \u00A0" + min + this.unitName;
        }
        if (this.maxText !== null) {
            this.maxText.textContent = "max: \u00A0" + max + this.unitName;
        }
        if (this.meanText !== null) {
            this.meanText.textContent = "mean: " + mean + this.unitName;
        }
        if (this.lastText !== null) {
            this.lastText.textContent = "last: " + last + this.unitName;
        }
        if (this.ctx !== null) {
            this.ctx.fillStyle = "#010";
            this.ctx.fillRect(0, 0, MonitorGraphWidth, MonitorGraphHeight);
            this.ctx.fillStyle = "#0f0";
            this.samples.each(function (v, i) {
                _this.ctx.fillRect(i, MonitorGraphHeight, 1, -(v * scale));
            });
        }
    };
    return MonitorWidget;
}(Widget));
var CounterWidget = (function (_super) {
    __extends(CounterWidget, _super);
    function CounterWidget(name, counter) {
        _super.call(this, name);
        this.counter = counter;
        this.text = document.createElement("div");
        this.element.appendChild(this.text);
    }
    CounterWidget.prototype.sync = function () {
        this.text.textContent = this.name + ": " + this.counter.value;
    };
    return CounterWidget;
}(Widget));

var container = null;
var initialized = false;
/**
 * Initialize Performance Monitor.
 */
function initPerfMonitor(options) {
    if (!initialized) {
        if (options.container) {
            container = options.container;
        }
        initialized = true;
    }
}
/**
 * Check that everything is properly initialized.
 */
function checkInit() {
    if (!container) {
        container = document.createElement("div");
        container.style.cssText = "position: fixed;" +
            "opacity: 0.9;" +
            "right: 0;" +
            "bottom: 0";
        document.body.appendChild(container);
    }
    initialized = true;
}
/**
 * Start FPS monitor
 */
function startFPSMonitor(flags) {
    if (flags === void 0) { flags = exports.MonitorWidgetFlags.HideMin | exports.MonitorWidgetFlags.HideMax |
        exports.MonitorWidgetFlags.HideMean | exports.MonitorWidgetFlags.RoundValues; }
    checkInit();
    var data = new MonitorSamples(MonitorMaxSamples);
    var w = new MonitorWidget("FPS", flags, "", data);
    container.appendChild(w.element);
    var alpha = 2 / 121;
    var last = 0;
    var fps = 60;
    function update(now) {
        if (last > 0) {
            fps += alpha * ((1000 / (now - last)) - fps);
        }
        last = now;
        data.addSample(fps);
        w.invalidate();
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
/**
 * Start Memory Monitor
 */
function startMemMonitor(flags) {
    if (flags === void 0) { flags = exports.MonitorWidgetFlags.HideMin | exports.MonitorWidgetFlags.HideMean; }
    checkInit();
    if (performance.memory === undefined) {
        return;
    }
    var data = new MonitorSamples(MonitorMaxSamples);
    var w = new MonitorWidget("Memory", flags, "MB", data);
    container.appendChild(w.element);
    function update() {
        data.addSample(Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)));
        w.invalidate();
        setTimeout(update, 30);
    }
    update();
}
var ProfilerDetails = (function () {
    function ProfilerDetails(name, unitName, flags) {
        this.data = new MonitorSamples(MonitorMaxSamples);
        this.widget = new MonitorWidget(name, flags, unitName, this.data);
        this.startTime = -1;
    }
    return ProfilerDetails;
}());
var profilerInstances = {};
var CounterDetails = (function () {
    function CounterDetails(name, interval) {
        var _this = this;
        this.data = interval === undefined ? new BasicCounter() : new SlidingCounter(interval);
        this.widget = new CounterWidget(name, this.data);
        this.data.onChange = function () {
            _this.widget.invalidate();
        };
    }
    return CounterDetails;
}());
var counterInstances = {};
/**
 * Initialize profiler and insert into container.
 */
function initProfiler(name, flags) {
    if (flags === void 0) { flags = 0; }
    checkInit();
    var profiler = profilerInstances[name];
    if (profiler === void 0) {
        profilerInstances[name] = profiler = new ProfilerDetails(name, "ms", flags);
        container.appendChild(profiler.widget.element);
    }
}
/**
 * Initialize counter and insert into container.
 */
function initCounter(name, interval) {
    checkInit();
    var counter = counterInstances[name];
    if (counter === void 0) {
        counterInstances[name] = counter = new CounterDetails(name, interval);
        container.appendChild(counter.widget.element);
    }
}
function startProfile(name) {
    var profiler = profilerInstances[name];
    if (profiler !== void 0) {
        profiler.startTime = performance.now();
    }
}
function endProfile(name) {
    var now = performance.now();
    var profiler = profilerInstances[name];
    if (profiler !== void 0 && profiler.startTime !== -1) {
        profiler.data.addSample(now - profiler.startTime);
        profiler.widget.invalidate();
    }
}
function count(name, value) {
    if (value === void 0) { value = 1; }
    var counter = counterInstances[name];
    if (counter !== void 0) {
        counter.data.inc(value);
    }
}

exports.initPerfMonitor = initPerfMonitor;
exports.startFPSMonitor = startFPSMonitor;
exports.startMemMonitor = startMemMonitor;
exports.initProfiler = initProfiler;
exports.initCounter = initCounter;
exports.startProfile = startProfile;
exports.endProfile = endProfile;
exports.count = count;

Object.defineProperty(exports, '__esModule', { value: true });

})));