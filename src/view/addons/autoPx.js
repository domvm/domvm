const t = true;

const unitlessProps = {
	animationIterationCount: t,
	boxFlex: t,
	boxFlexGroup: t,
	columnCount: t,
	counterIncrement: t,
	fillOpacity: t,
	flex: t,
	flexGrow: t,
	flexOrder: t,
	flexPositive: t,
	flexShrink: t,
	float: t,
	fontWeight: t,
	gridColumn: t,
	lineHeight: t,
	lineClamp: t,
	opacity: t,
	order: t,
	orphans: t,
	stopOpacity: t,
	strokeDashoffset: t,
	strokeOpacity: t,
	strokeWidth: t,
	tabSize: t,
	transform: t,
	transformOrigin: t,
	widows: t,
	zIndex: t,
	zoom: t,
};

export function autoPx(name, val) {
	return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
}