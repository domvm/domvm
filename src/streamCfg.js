export let sub = null;
export let val = null;
export let is = null;
export let unsub = null;

/* example flyd adapter:
{
	sub:	(s,fn) => flyd.on(fn, s),
	val:	s => s(),
	is:		s => flyd.isStream(s),
	unsub:	s => s.end(),
}
*/
export function streamCfg(cfg) {
	sub		= cfg.sub;
	val		= cfg.val;
	is		= cfg.is;
	unsub	= cfg.unsub;
}