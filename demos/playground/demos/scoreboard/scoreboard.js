var el = domvm.defineElement,
	vw = domvm.defineView;

function Scoreboard(vm, players) {
	var sorted = sortedByScoreDesc(players),
		lastPos = new WeakMap(),
		curPos = new WeakMap();

	vm.config({hooks: {
		didRedraw: function() {
			for (var i in vm.refs.player) {
				var ref = vm.refs.player[i];
				ref.patch({style: calcPlayerStyle(ref.data, true)});
			}
		}
	}});

	return function() {
		sorted.forEach(function(p,i) { lastPos.set(p, i); });
		sorted = sortedByScoreDesc(players);
		sorted.forEach(function(p,i) { curPos.set(p, i); });

		return el("#scoreboard", [
			el(".board", sorted.map(player =>
				el(".player", {style: calcPlayerStyle(player), _ref: "player." + player.name, _data: player}, [
					el(".name", player.name),
					el(".score", player.score),
				])
			)),
			el("form.admin", [
				players.map(player =>
					el(".player", [
						player.name,
						el("input.score", {type: "number", value: player.score, onchange: [handleScoreChange, player]}),
						el("button",      {type: "button", onclick: [handleDeleteClick, player]}, "X"),
					])
				),
				el(".player", [
					el("input",       {type: "text",   name: "name",  _ref: "name", placeholder: "New player..."}),
					el("input.score", {type: "number", name: "score", _ref: "score"}),
					el("button",      {type: "button", onclick: handleAddClick}, "Add"),
				]),
			]),
		]);
	};

	// makes a sorted copy
	function sortedByScoreDesc(players) {
		return players.slice().sort(function(a, b) {
			if (b.score == a.score)
				return a.name.localeCompare(b.name);		// stabalize the sort
			return b.score - a.score;

		});
	}

	// gets transform for prior pos order
	function calcPlayerStyle(player, delayed) {
		// delayed
		if (delayed)
			return {transition: "250ms", transform: null};
		// initial
		else {
			var offset = (lastPos.get(player) * 18) - (curPos.get(player) * 18);
			return {
				transform: "translateY(" + offset + "px)",
				transition: null//offset == 0 ? "",
			};
		}
	}

	function handleScoreChange(player, e, node) {
		var score = +node.el.value;

		if (isNaN(+score))
			return;

		player.score = score;
		vm.redraw();
	}

	function handleAddClick(e, node) {
		var name = vm.refs.name.el.value;
		var score = +vm.refs.score.el.value;

		if (!name.length || isNaN(+score))
			return;

		players.push({name: name, score: score});
		vm.redraw();
	}

	function handleDeleteClick(player, e) {
		players.splice(players.indexOf(player), 1);
		vm.redraw();
	}
}

var players = [
	{
		name: "Mark",
		score: 3,
	},
	{
		name: "Troy",
		score: 2,
	},
	{
		name: "Jenny",
		score: 1,
	},
	{
		name: "David",
		score: 8,
	},
];

domvm.createView(Scoreboard, players).mount(document.body);