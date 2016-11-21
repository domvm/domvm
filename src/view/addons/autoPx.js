import { TRUE } from '../../utils';

const unitlessProps = {
	animationIterationCount: TRUE,
	boxFlex: TRUE,
	boxFlexGroup: TRUE,
	columnCount: TRUE,
	counterIncrement: TRUE,
//	fillOpacity: TRUE,
	flex: TRUE,
	flexGrow: TRUE,
	flexOrder: TRUE,
	flexPositive: TRUE,
	flexShrink: TRUE,
	float: TRUE,
	fontWeight: TRUE,
	gridColumn: TRUE,
	lineHeight: TRUE,
	lineClamp: TRUE,
	opacity: TRUE,
	order: TRUE,
	orphans: TRUE,
//	stopOpacity: TRUE,
//	strokeDashoffset: TRUE,
//	strokeOpacity: TRUE,
//	strokeWidth: TRUE,
	tabSize: TRUE,
	transform: TRUE,
	transformOrigin: TRUE,
	widows: TRUE,
	zIndex: TRUE,
	zoom: TRUE,
};

export function autoPx(name, val) {
	return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
}