import { isArr, isVal, isElem, isFunc } from '../utils';
import { defineElement } from './defineElement';
import { defineView } from './defineView';
import { defineFragment } from './defineFragment';
import { injectElement } from './injectElement';
import { injectView } from './injectView';
import { ViewModel } from './ViewModel';

function noop() {}

// does not handle defineComment, defineText, defineSVG (ambiguous); use plain text vals or explicit factories in templates.
// does not handle defineElementSpread (not available in all builds); use exlicit factories in templates.
export function h(a) {
	return (
		isVal(a)				? defineElement		:
		isFunc(a)				? defineView		:	// todo: es6 class constructor
		isElem(a)				? injectElement		:
		a instanceof ViewModel	? injectView		:
		isArr(a)				? defineFragment	:
		noop
	).apply(null, arguments);
}