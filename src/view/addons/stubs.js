import { autoPx } from './autoPx';
import { isStream, hookStream } from './streamCfg';

// stubs for optional addons that still exist in code so need lightweight impls to run
function isStreamStub() { return false; };
function hookStreamStub() { };
function autoPxStub(name, val) { return val; };

export { isStreamStub as isStream };
export { hookStreamStub as hookStream }
export { autoPxStub as autoPx };