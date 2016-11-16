import { ViewModelProto, views } from '../ViewModel';
import { isArr } from '../../utils';		// defProp

/*
defProp(ViewModelProto, 'body', {
	get: function() {
		return nextSubVms(this.node, []);
	}
});
*/

ViewModelProto.body = function() {
	return nextSubVms(this.node, []);
};

function nextSubVms(n, accum) {
	var body = n.body;

	if (isArr(body)) {
		for (var i = 0; i < body.length; i++) {
			var n2 = body[i];

			if (n2.vmid != null)
				accum.push(views[n2.vmid]);
			else
				nextSubVms(n2, accum);
		}
	}

	return accum;
}