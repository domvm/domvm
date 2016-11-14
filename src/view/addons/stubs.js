import { autoPx } from './autoPx';
import { cssTag } from './cssTag';
import { isStream, hookStream } from './streamCfg';

// stubs for optional addons that still exist in code so need lightweight impls to run
function isStreamStub() { return false; };
function hookStreamStub() { };
function autoPxStub(name, val) { return val; };

const tagObj = {};
function cssTagStub(tag) { tagObj.tag = tag; return tagObj; };

export { autoPxStub as autoPx }
export { cssTagStub as cssTag }
export { isStreamStub as isStream }
export { hookStreamStub as hookStream }