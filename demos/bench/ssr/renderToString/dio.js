"use strict";

const dio = require('dio.js');

const Component = dio.Component,
    VComponent = dio.VComponent,
    VElement = dio.VElement,
    VText = dio.VText,
    renderToString = dio.renderToString;

class App extends Component {
    render() {
        const childrenNum = this.props.childrenNum;
        
        return VElement('div', {className : 'app'}, [
            VComponent(Header, { childrenNum }),
            VComponent(Content, { childrenNum }),
            VComponent(Footer, { childrenNum })
        ]);
    }
}

class Header extends Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(VElement('div', {id : 'header-' + i++}));
        }

        return VElement('div', {className : 'header'}, children);
    }
}

class Content extends Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(
                VElement('b', null, [VText('bold' + i)]),
                VElement('span',{className : 'link'},[
                      VComponent(Link, {href : '/', value : 'link-' + i})
                ]),
                VElement('i', null, [VText('italic' + i++)]),
                VElement('div',null, [
                    VElement('div',null,[
                        VElement('div',null,[
                            VElement('div',null,[VText('div')])
                        ])
                    ])
                ])
            );
        }

        return VElement('div', {className : 'header'}, children);
    }
}

class Link extends Component {
    render() {
        return VElement('a', {href : this.props.href}, [VText(this.props.value)]);
    }
}

class Footer extends Component {
    render() {
        const childrenNum = this.props.childrenNum,
            children = [];
        let i = 0;

        while(i < childrenNum) {
            children.push(VElement('div', {id : 'footer-' + i++}));
        }

        return VElement('div', {className : 'footer'}, children);
    }
}

module.exports = childrenNum => () => renderToString(VComponent(App, {childrenNum}));
