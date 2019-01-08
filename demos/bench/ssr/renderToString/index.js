"use strict";

const CHILDREN_NUM = 200;

module.exports = {
//	'vidom'   : require('./vidom')(CHILDREN_NUM),
//	'inferno' : require('./inferno')(CHILDREN_NUM),
	'domvm'   : require('./domvm')(CHILDREN_NUM),
	'preact'  : require('./preact')(CHILDREN_NUM),
	'react'   : require('./react')(CHILDREN_NUM),
    'vue'     : require('./vue')(CHILDREN_NUM),
};