import { streamCfg } from './streamCfg';

if (typeof flyd !== "undefined") {
	streamCfg({
		is:		s => flyd.isStream(s),
		val:	s => s(),
		sub:	(s, fn) => flyd.on(fn, s),
		unsub:	s => s.end(true),
	});
}