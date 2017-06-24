"use strict";

const Inferno = require('inferno');
const InfernoServer = require('inferno-server');
const InfernoComponent = require('inferno-component');

const createVNode = Inferno.createVNode;

class App extends InfernoComponent {
    render(props) {
        const childrenNum = props.childrenNum;

        return createVNode(66, 'div', 'app', [
            createVNode(4, Header, null, null, { childrenNum }, null, null, true),
            createVNode(4, Content, null, null, { childrenNum }, null, null, true),
            createVNode(4, Footer, null, null, { childrenNum }, null, null, true)
        ], null, null, false);
    }
}

class Header extends InfernoComponent {
    render(props) {
        const childrenNum = props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(createVNode(2, 'div', null, null, { id : 'header-' + i++ }, null, null, true));
        }

        return createVNode(2, 'div', 'header', children, null, null, null, true);
    }
}

class Content extends InfernoComponent {
    render(props) {
        const childrenNum = props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(
                createVNode(2, 'b', null, 'bold' + i, null, null, null, true),
                createVNode(2,
                    'span',
                    'link',
                    createVNode(4, Link, null, null, {
                        href : '/',
                        value : 'link-' + i
                    }, null, null, null, true), null, null, null, true),
                createVNode(2, 'i', null, 'italic' + i++, null, null, null, true),
                createVNode(2,
                    'div',
                    null,
                    createVNode(2,
                        'div',
                        null,
                        createVNode(2,
                            'div',
                            null,
                            createVNode(2,
                                'div',
                                null,
                                'div', null, null, null, true), null, null, null, true), null, null, null, true), null, null, null, true));
        }

        return createVNode(66, 'div', 'content', children, null, null, null, true);
    }
}

class Link extends InfernoComponent {
    render(props) {
        return createVNode(2, 'a', null, props.value, { href : props.href }, null, null, true);
    }
}

class Footer extends InfernoComponent {
    render(props) {
        const childrenNum = props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(createVNode(2, 'div', null, null, { id : 'footer-' + i++ }, null, null, true));
        }

        return createVNode(2, 'div', 'footer', children, null, null, null, true);
    }
}

module.exports = childrenNum => () => InfernoServer.renderToString(createVNode(4, App, null, null, { childrenNum }, null, null, true));
