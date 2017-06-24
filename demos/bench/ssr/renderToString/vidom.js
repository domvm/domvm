"use strict";

const vidom = require('vidom'),
    node = vidom.node;

class App extends vidom.Component {
    onRender() {
        const childrenNum = this.attrs.childrenNum;

        return node('div').setAttrs({ className : 'app' }).setChildren([
            node(Header).setAttrs({ childrenNum }),
            node(Content).setAttrs({ childrenNum }),
            node(Footer).setAttrs({ childrenNum })
        ]);
    }
}

class Header extends vidom.Component {
    onRender() {
        const childrenNum = this.attrs.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(node('div').setAttrs({ id : 'header-' + i++ }));
        }

        return node('div').setAttrs({ className : 'header' }).setChildren(children);
    }
}

class Content extends vidom.Component {
    onRender() {
        const childrenNum = this.attrs.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(
                node('b').setChildren('bold' + i),
                node('span')
                    .setAttrs({ className : 'link' })
                    .setChildren(node(Link).setAttrs({ href : '/', value : 'link-' + i })),
                node('i').setChildren('italic' + i++),
                node('div').setChildren(
                    node('div').setChildren(
                        node('div').setChildren(
                            node('div').setChildren('div')))));
        }

        return node('div')
            .setAttrs({ className : 'content' })
            .setChildren(children);
    }
}

class Link extends vidom.Component {
    onRender() {
        return node('a')
            .setAttrs({ href : this.attrs.href })
            .setChildren(this.attrs.value);
    }
}

class Footer extends vidom.Component {
    onRender() {
        const childrenNum = this.attrs.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(node('div').setAttrs({ id : 'footer-' + i++ }));
        }

        return node('div')
            .setAttrs({ className : 'footer' })
            .setChildren(children);
    }
}

module.exports = childrenNum => () => vidom.renderToString(node(App).setAttrs({ childrenNum }));
