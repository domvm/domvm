// NOTE: if adding a new *VNode* type, make it < FRAGMENT and renumber rest.
// There are some places that test <= FRAGMENT to assert if node is a VNode

// VNode types
export const ELEMENT	= 1;
export const TEXT		= 2;
export const COMMENT	= 3;
export const FRAGMENT	= 4;

// placeholder types
export const VVIEW		= 5;
export const VMODEL		= 6;