// VNode types
// NOTE: when adding a a type here, add it above FRAGMENT and renumber. There are
// optimizations in some places that test <= FRAGMENT to assert if node is a VNode
export const ELEMENT	= 1;
export const TEXT		= 2;
export const COMMENT	= 3;
export const FRAGMENT	= 4;

// placeholder types
export const VVIEW		= 5;
export const VMODEL		= 6;