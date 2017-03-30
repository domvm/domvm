// NOTE: if adding a new *VNode* type, make it < COMMENT and renumber rest.
// There are some places that test <= COMMENT to assert if node is a VNode

// VNode types
export const ELEMENT	= 1;
export const TEXT		= 2;
export const COMMENT	= 3;

// placeholder types
export const VVIEW		= 4;
export const VMODEL		= 5;