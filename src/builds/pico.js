import { ViewModel } from "../view/ViewModel";
import { VNode } from "../view/VNode";

import { createView } from "../view/createView";

import { defineElement } from "../view/defineElement";
import { defineSvgElement } from "../view/defineSvgElement";
import { defineText } from "../view/defineText";
import { defineComment } from "../view/defineComment";
import { defineView } from "../view/defineView";

import { injectView } from "../view/injectView";
import { injectElement } from "../view/injectElement";

import { FIXED_BODY, DEEP_REMOVE, KEYED_LIST } from "../view/initElementNode";

import { config } from '../view/config';

export default {
	config,

	ViewModel,
	VNode,

	createView,

	defineElement,
	defineSvgElement,
	defineText,
	defineComment,
	defineView,

	injectView,
	injectElement,

	FIXED_BODY,
	DEEP_REMOVE,
	KEYED_LIST,
}