"use strict";

const Preact = require('preact'),
    renderToString = require('preact-render-to-string');

class App extends Preact.Component {
    render() {
        const childrenNum = this.props.childrenNum;

        return Preact.h('div', { className : 'app' }, [
            Preact.h(Header, { childrenNum }),
            Preact.h(Content, { childrenNum }),
            Preact.h(Footer, { childrenNum })
        ]);
    }
}

class Header extends Preact.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(Preact.h('div', { id : 'header-' + i++ }));
        }

        return Preact.h('div', { className : 'header' }, children);
    }
}

class Content extends Preact.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(
                Preact.h('b', null, 'bold' + i),
                Preact.h(
                    'span',
                    { className : 'link' },
                    Preact.h(Link, { href : '/', value : 'link-' + i })),
                Preact.h('i', null, 'italic' + i++),
                Preact.h(
                    'div',
                    null,
                    Preact.h(
                        'div',
                        null,
                        Preact.h(
                            'div',
                            null,
                            Preact.h(
                                'div',
                                null,
                                'div')))));
        }

        return Preact.h('div', { className : 'content' }, children);
    }
}

class Link extends Preact.Component {
    render() {
        return Preact.h('a', { href : this.props.href }, this.props.value);
    }
}

class Footer extends Preact.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(Preact.h('div', { id : 'footer-' + i++ }));
        }

        return Preact.h('div', { className : 'footer' }, children);
    }
}

module.exports = childrenNum => () => renderToString(Preact.h(App, { childrenNum }));
