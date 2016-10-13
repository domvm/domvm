import { createView } from "./src/createView";

import { defineElement } from "./src/defineElement";
import { defineText } from "./src/defineText";
import { defineComment } from "./src/defineComment";
import { defineView } from "./src/defineView";

import { injectView } from "./src/injectView";
import { injectElement } from "./src/injectElement";



/*
	Possible sigs:

	h(viewFn, model, key, opts)	-> defineView
	h(tag, attrs, ...children)	-> defineElement
	h(element)					-> injectElement
	h(vm)						-> injectView
	"text"						-> defineText
	"<!--"						-> defineComment
*/
export function hyperscript() {
	const args = arguments;
/*
	switch(args.length) {
		case 1:
		case 2:
		case 3:
	}
*/
}

// this version expects explicit children arrays; arguments are not sliced
/*
	Possible sigs:

	h(viewFn, model, key, opts)	-> defineView
	h(tag, attrs, ...children)	-> defineElement
	h(element)					-> injectElement
	h(vm)						-> injectView
	"text"						-> defineText
	"<!--"						-> defineComment
*/
export function hyperscript2() {
	const args = arguments;
/*
	switch(args.length) {
		case 1:
		case 2:
		case 3:
	}
*/
}