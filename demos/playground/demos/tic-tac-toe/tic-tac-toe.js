// domvm impl of https://facebook.github.io/react/tutorial/tutorial.html

var el = domvm.defineElement,
	tx = domvm.defineText;

function GameView(vm, game) {
	function clickCell(i) {
		game.move(i);
	}

	function clickHist(histPos) {
		game.jumpTo(histPos);
		return false;
	}

	function playerTpl() {
		return game.winner
			? tx("Winner: " + game.winner)
			: tx("Next Player: " + (game.histPos % 2 == 0 ? "X" : "O"));
	}

	return () =>
		el(".game", [
			el(".board", game.history[game.histPos].map((val, i) =>
				el("button.cell", {onclick: [clickCell, i]}, val)
			)),
			el(".info", [
				playerTpl(),
				el("ol.hist", game.history.map((board, histPos) =>
					el("li", {class: histPos == game.histPos ? "active" : null}, [
						el("a", {href: "#", onclick: [clickHist, histPos]}, histPos == 0 ? "Game start" : "Move #" + histPos),
					])
				))
			]),
		])
}

function Game() {
	this.history = [
		Array(9).fill(null)
	];

	this.histPos = 0;

	this.winner = null;

	this.view = domvm.createView(GameView, this);
}

Game.prototype = {
	constructor: Game,

	_calculateWinner: function() {
		var squares = this.history[this.histPos];

		var lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

		for (var i = 0; i < lines.length; i++) {
			var _lines$i = lines[i];
			var a = _lines$i[0];
			var b = _lines$i[1];
			var c = _lines$i[2];

			if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
				this.winner = squares[a];
				return;
			}
		}

		this.winner = null;
	},

	jumpTo: function(histPos) {
		this.histPos = histPos;

		this._calculateWinner();
		this.view.redraw();
	},

	move: function(i) {
		var board = this.history[this.histPos];

		if (board[i] == null && this.winner == null) {
			var clone = board.slice();
			clone[i] = this.histPos % 2 == 0 ? "X" : "O";
			this.history[++this.histPos] = clone;

			while (this.history.length > this.histPos + 1)
				this.history.pop();

			this._calculateWinner();
			this.view.redraw();
		}
	}
};

// init game and mount its view into the document

var game = new Game();

game.view.mount(document.body);

// let's interact programatically!

setTimeout(function() {
	game.move(4);
}, 1000)

setTimeout(function() {
	game.move(6);
}, 2000);

setTimeout(function() {
	game.move(1);
}, 3000);


setTimeout(function() {
	game.jumpTo(2);
}, 4000);

setTimeout(function() {
	game.jumpTo(1);
}, 5000);