export let isStream = null;
export let streamVal = null;
export let subStream = null;
export let unsubStream = null;

/* example flyd adapter:
{
	is:		s => flyd.isStream(s),
	val:	s => s(),
	sub:	(s,fn) => flyd.on(fn, s),
	unsub:	s => s.end(),
}
*/
export function streamCfg(cfg) {
	isStream	= cfg.is;
	streamVal	= cfg.val;
	subStream	= cfg.sub;
	unsubStream	= cfg.unsub;
}