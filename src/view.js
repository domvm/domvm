import { ViewModel } from "./view/ViewModel";
import { VNode } from "./view/VNode";

import { createView } from "./view/createView";

import { defineElement } from "./view/defineElement";
import { defineText } from "./view/defineText";
import { defineComment } from "./view/defineComment";
import { defineView } from "./view/defineView";

import { injectView } from "./view/injectView";
import { injectElement } from "./view/injectElement";

import { defineElementFixed } from './view/defineElementFixed';

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

	defineElementFixed,
};