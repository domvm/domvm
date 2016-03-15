'use strict';

var benchmark = require('vdom-benchmark-base');
var domvm = require('domvm');

var NAME = 'domvm';
var VERSION = '0.9';

function renderTree(nodes) {
  var children = [];

  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.children !== null) {
      children.push(["div", {_key: n.key}].concat(renderTree(n.children)));
    } else {
      children.push(["span", {_key: n.key}, n.key]);
    }
  }

  return children;
}

function View() {
  return function(vm, nodes) {
    return ["div"].concat(renderTree(nodes));
  };
}

function BenchmarkImpl(container, a, b) {
  this.container = container;
  this.a = a;
  this.b = b;
}

var vm;

BenchmarkImpl.prototype.setUp = function() {
};

BenchmarkImpl.prototype.tearDown = function() {
  vm.unmount();
};

BenchmarkImpl.prototype.render = function() {
  vm = domvm.view(View, this.a, 0).mount(this.container);
};

BenchmarkImpl.prototype.update = function() {
  vm.update(this.b);
};

document.addEventListener('DOMContentLoaded', function(e) {
  benchmark(NAME, VERSION, BenchmarkImpl);
}, false);