"use strict";

const Vue = require('vue'),
    renderer = require('vue-server-renderer').createRenderer();

let childrenNum;

Vue.component('Header', {
    props : ['childrenNum'],
    render(h) {
        const children = [];
        let i = 0;

        while(i < this.childrenNum) {
            children.push(h('div', { attrs : { id : 'header-' + i++ } }));
        }

        return h('div', { 'class' : 'header' }, children);
    }
});

Vue.component('Content', {
    props : ['childrenNum'],
    render(h) {
        const children = [];
        let i = 0;

        while(i < this.childrenNum) {
            children.push(
                h('b', 'bold' + i),
                h(
                    'span',
                    { 'class' : 'link' },
                    [h('Link', { props : { href : '/', value : 'link-' + i } })]),
                h('i', 'italic' + i++),
                h(
                    'div',
                    [h(
                        'div',
                        [h(
                            'div',
                            h('div', 'div'))])]));
        }

        return h('div', { 'class' : 'content' }, children);
    }
});

Vue.component('Link', {
    props : ['href', 'value'],
    render(h) {
        return h('a', { attrs : { href : this.href } }, this.value);
    }
});

Vue.component('Footer', {
    props : ['childrenNum'],
    render(h) {
        const children = [];
        let i = 0;

        while(i < this.childrenNum) {
            children.push(h('div', { attrs : { id : 'footer-' + i++ } }));
        }

        return h('div', { 'class' : 'footer' }, children);
    }
});

const app = new Vue({
    render(h) {
        return h(
            'div',
            { 'class' : 'app' },
            [
                h('Header', { props : { childrenNum } }),
                h('Content', { props : { childrenNum } }),
                h('Footer', { props : { childrenNum } })
            ]);
    }
});

const origEnv = process.env,
    hackedEnv = { NODE_ENV : 'production' };

module.exports = _childrenNum => {
    childrenNum = _childrenNum;

    return deferred => {
        process.env = hackedEnv;

        renderer.renderToString(app, () => {
            deferred.resolve();

            process.env = origEnv;
        });
    };
}
