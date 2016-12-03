import { ViewModel } from "../../src/view/ViewModel";
import { VNode } from "../../src/view/VNode";

import { createView } from "../../src/view/createView";

import { defineElement } from "../../src/view/defineElement";
import { defineText } from "../../src/view/defineText";
import { defineComment } from "../../src/view/defineComment";
import { defineFragment } from "../../src/view/defineFragment";
import { defineView } from "../../src/view/defineView";

import { injectView } from "../../src/view/injectView";
import { injectElement } from "../../src/view/injectElement";

import { FIXED_BODY, FAST_REMOVE, KEYED_LIST } from '../../src/view/initElementNode';

export default {
	ViewModel,
	VNode,

	createView,

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