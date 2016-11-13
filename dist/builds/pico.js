import { ViewModel } from "../../src/view/ViewModel";
import { VNode } from "../../src/view/VNode";

import { createView } from "../../src/view/createView";

import { defineElement, FIXED_BODY, FAST_REMOVE } from "../../src/view/defineElement";
import { defineText } from "../../src/view/defineText";
import { defineComment } from "../../src/view/defineComment";
import { defineView } from "../../src/view/defineView";

import { injectView } from "../../src/view/injectView";
import { injectElement } from "../../src/view/injectElement";

export default {
	ViewModel,
	VNode,

	createView,

	defineElement,
	defineText,
	defineComment,
	defineView,

	injectView,
	injectElement,

	FIXED_BODY,
	FAST_REMOVE,
}