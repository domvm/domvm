import { ViewModel, views as _views } from "../view/ViewModel";
import { VNode } from "../view/VNode";

import { createView } from "../view/createView";

import { h } from "../view/h";

import { defineElement } from "../view/defineElement";
import { defineText } from "../view/defineText";
import { defineComment } from "../view/defineComment";
import { defineFragment } from "../view/defineFragment";
import { defineView } from "../view/defineView";

import { injectView } from "../view/injectView";
import { injectElement } from "../view/injectElement";

import { FIXED_BODY, FAST_REMOVE, KEYED_LIST } from "../view/initElementNode";

export default {
	_views,

	ViewModel,
	VNode,

	createView,

	h,

	defineElement,
	defineText,
	defineComment,
	defineFragment,
	defineView,

	injectView,
	injectElement,

	FIXED_BODY,
	FAST_REMOVE,
	KEYED_LIST,
}