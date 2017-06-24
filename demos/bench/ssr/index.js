"use strict";

const benchmark = require('benchmark'),
    cliff = require('cliff'),
    fs = require('fs'),
    suits = {
        renderToString : require('./renderToString')
    },
    versions = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')).dependencies;
let results;

Object.keys(suits).forEach(suitName => {
    const suite = new benchmark.Suite(
        suitName,
        {
            onStart() {
                results = [];
                console.log(`Starts suit "${suitName}"`);
            },

            onComplete() {
                console.log('\n' + cliff.stringifyObjectRows(
                    results.sort((resultA, resultB) => resultA.mean - resultB.mean),
                    ['', 'mean time', 'ops/sec'],
                    ['', 'green', 'yellow']) + '\n');
            }
        }),
        test = suits[suitName];

    Object.keys(test).forEach(testName => {
        let i = 0,
            name = `  ${testName} v${versions[testName.indexOf('.') > -1? testName.split('.')[0] : testName]} `,
            testFn = test[testName],
            defer = !!testFn.length;

        suite.add(
            testName,
            defer?
                deferred => {
                    testFn(deferred);
                } :
                testFn,
            {
                defer,

                onStart() {
                    console.log(`${name}`);
                },

                onCycle() {
                    console.log(`\x1B[1A${name}` + new Array(i++).join('.'));
                },

                onComplete() {
                    results.push({
                        '' : name,
                        mean : this.stats.mean,
                        'mean time' : (this.stats.mean * 1000).toFixed(3) + 'ms',
                        'ops/sec' : (1 / this.stats.mean).toFixed(0)
                    });
                }
            });
    });

    suite.run();
});
