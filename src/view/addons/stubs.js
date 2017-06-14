import { cssTag } from './cssTag';
import { isStream, hookStream } from './streamCfg';
import { noop } from '../../utils';

// stubs for optional addons that still exist in code so need lightweight impls to run
function isStreamStub() { return false; };
const hookStreamStub = noop;

const tagObj = {};
function cssTagStub(tag) { tagObj.tag = tag; return tagObj; };

export { cssTagStub as cssTag }
export { isStreamStub as isStream }
export { hookStreamStub as hookStream }