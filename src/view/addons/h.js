import { isVal, isElem, isFunc, noop } from '../../utils';
import { defineElement } from '../defineElement';
import { defineView } from '../defineView';
import { injectElement } from '../injectElement';
import { injectView } from '../injectView';
import { ViewModel } from '../ViewModel';

// does not handle defineComment, defineText, defineSvgElement (ambiguous); use plain text vals or explicit factories in templates.
// does not handle defineElementSpread (not available in all builds); use exlicit factories in templates.
export function h(a) {
	return (
		isVal(a)				? defineElement		:
		isFunc(a)				? defineView		:
		isElem(a)				? injectElement		:
		a instanceof ViewModel	? injectView		:
		noop
	).apply(null, arguments);
}