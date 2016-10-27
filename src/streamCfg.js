export let subStream = null;
export let streamVal = null;
export let isStream = null;
export let unsubStream = null;

/* example flyd adapter:
{
	sub:	(s,fn) => flyd.on(fn, s),
	val:	s => s(),
	is:		s => flyd.isStream(s),
	unsub:	s => s.end(),
}
*/
export function streamCfg(cfg) {
	subStream	= cfg.sub;
	streamVal	= cfg.val;
	isStream	= cfg.is;
	unsubStream	= cfg.unsub;
}