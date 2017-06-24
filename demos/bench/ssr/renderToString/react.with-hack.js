"use strict";

const React = require('react'),
    ReactDomServer = require('react-dom/server');

class App extends React.Component {
    render() {
        const childrenNum = this.props.childrenNum;

        return React.createElement('div', { className : 'app' }, [
            React.createElement(Header, { childrenNum }),
            React.createElement(Content, { childrenNum }),
            React.createElement(Footer, { childrenNum })
        ]);
    }
}

class Header extends React.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(React.createElement('div', { id : 'header-' + i++ }));
        }

        return React.createElement('div', { className : 'header' }, children);
    }
}

class Content extends React.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(
                React.createElement('b', null, 'bold' + i),
                React.createElement(
                    'span',
                    { className : 'link' },
                    React.createElement(Link, { href : '/', value : 'link-' + i })),
                React.createElement('i', null, 'italic' + i++),
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'div',
                                null,
                                'div')))));
        }

        return React.createElement('div', { className : 'content' }, children);
    }
}

class Link extends React.Component {
    render() {
        return React.createElement('a', { href : this.props.href }, this.props.value);
    }
}

class Footer extends React.Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(React.createElement('div', { id : 'footer-' + i++ }));
        }

        return React.createElement('div', { className : 'footer' }, children);
    }
}

const origEnv = process.env,
    hackedEnv = { NODE_ENV : 'production' };

module.exports = childrenNum => () => {
    process.env = hackedEnv;

    const res = ReactDomServer.renderToString(React.createElement(App, { childrenNum }));

    process.env = origEnv;

    return res;
};
