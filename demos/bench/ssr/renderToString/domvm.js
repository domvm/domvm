var domvm = require('../../../../dist/server/domvm.server.cjs.js');

var el = domvm.defineElement,
    vw = domvm.defineView;

function mkArr(count, fn, frag) {
  let i = 0, arr = [];

  while (i < count)
    frag ? arr.push.apply(arr, fn(i++)) : arr.push(fn(i++));

  return arr;
}

function App(vm, data) {
  return () =>
    el('div', {class: "app"}, [
      vw(Header, data),
      vw(Content, data),
      vw(Footer, data),
    ])
}

function Header(vm, data) {
  return () =>
    el('div', {class: "header"}, mkArr(data.childrenNum, i =>
      el('div', { id : 'header-' + i })
    ))
}

function Content(vm, data) {
  return () =>
    el('div', {class: "content"}, mkArr(data.childrenNum, i => [
      el('b', 'bold' + i),
      el('span', {class: "link"}, [
        vw(Link, { href : '/', value : 'link-' + i })
      ]),
      el('i', 'italic' + i),
      el('div', [
        el('div', [
          el('div', [
            el('div', 'div')
          ])
        ])
      ])
    ], true))
}

function Link(vm, data) {
  return () =>
    el('a', { href : data.href }, data.value)
}

function Footer(vm, data) {
  return () =>
    el('div', {class: "footer"}, mkArr(data.childrenNum, i =>
      el('div', { id : 'footer-' + i })
    ))
}

module.exports = childrenNum => () => domvm.createView(App, { childrenNum }).html();