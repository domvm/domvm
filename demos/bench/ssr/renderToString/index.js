"use strict";

const CHILDREN_NUM = 200;

module.exports = {
	'vidom' : require('./vidom')(CHILDREN_NUM),						// 1630
	'inferno' : require('./inferno')(CHILDREN_NUM),					// 1430
	'domvm' : require('./domvm')(CHILDREN_NUM),						// 1246
	'preact' : require('./preact')(CHILDREN_NUM),					// 604
	'react.with-hack' : require('./react.with-hack')(CHILDREN_NUM),	// 228
	'vue' : require('./vue')(CHILDREN_NUM),							// 100
	'react' : require('./react')(CHILDREN_NUM),						// 30
};