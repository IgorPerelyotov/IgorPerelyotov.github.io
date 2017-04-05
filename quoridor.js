function Constants() {
	//Abbrevations below are:
	//f - first, l - last, h - horizontal, v - vertical
	this.fh = '1'.charCodeAt(0);
	this.lh = '9'.charCodeAt(0);
	this.fv = 'a'.charCodeAt(0);
	this.lv = 'i'.charCodeAt(0);
	//Horizontal and vertical;
	this.h = 'h'.charCodeAt(0);
	this.v = 'v'.charCodeAt(0);
	this.lastLines = ['9', '1', 'i', 'a'];
}

function Game(players) {
	/* 2 or 4 pawns may participate in a game */
	if (!(players === 2 || players === 4))
		return;
	/* Each pawn is a String containing a current position */
	this.pawns = players === 2 ? ['e1', 'e9'] : ['e1', 'e9', 'a5', 'i5'];
	/* Contains all walls placed on the board */
	this.walls = [];
	this.chars = new Constants();
	this.wallLimits = players === 2 ? [10, 10] : [5, 5, 5, 5];
	this.whichTurn = 0;
	/* This constant is for checking the range of coordiante symbols */
	var DISALLOWED_CHARS = /[^a-i1-9]/;
	var WALL_PATTERN = /^[a-h][1-8][vh]$/;
	this.listeners = {
		pawnmoved: [],
		wallput: []
	};
	Object.preventExtensions(this.listeners);
	var self = this;
	var pathSearch = new LeePathSearch(self);

	this.addListener = function(name, callback) {
		this.listeners[name].push(callback);
	};

	this.undoMovePawn = function(oldPosition) {
		prevTurn();
		this.pawns[this.whichTurn] = oldPosition;
	};

	this.undoPutWall = function() {
		prevTurn();
		this.wallLimits[this.whichTurn]++;
		this.walls.pop();
	};

	this.putWall = function(wall) {
		if (!this.isWallAccepted(wall))
			return;
		this.walls.push(wall);
		this.wallLimits[this.whichTurn]--;
		nextTurn();
		for (var i = 0; i < this.listeners.wallput.length; i++)
			this.listeners.wallput[i](wall);
	};

	this.weakPutWall = function(wall) {
		this.walls.push(wall);
		this.wallLimits[this.whichTurn]--;
		nextTurn();
	};

	this.isWallAccepted = function(wall) {
		return this.wallLimits[this.whichTurn] > 0 &&
			wall.search(WALL_PATTERN) !== -1 &&
			!crossAnotherWall(wall) &&
			!isBlockPath(wall);
	};

	this.isMoveAccepted = function(moveTo) {
		var legalMoves = this.findLegalMoves(this.pawns[this.whichTurn]);
		return legalMoves.indexOf(moveTo) !== -1;
	};

	this.movePawn = function(moveTo) {
		if (!this.isMoveAccepted(moveTo))
			return;
		var oldPosition = this.pawns[this.whichTurn];
		this.pawns[this.whichTurn] = moveTo;
		nextTurn();
		for (var i = 0; i < this.listeners.pawnmoved.length; i++) {
			this.listeners.pawnmoved[i](oldPosition, moveTo);
		}
	};

	this.weakMovePawn = function(moveTo) {
		this.pawns[this.whichTurn] = moveTo;
		nextTurn();
	};

	this.findLegalMoves = function(pawn, aroundOnly) {
		aroundOnly = typeof aroundOnly !== 'undefined' ? aroundOnly : false;
		var moves = [];
		var jump;
		moves.push(String.fromCharCode(pawn.charCodeAt(0) + 1, pawn.charCodeAt(1)));
		moves.push(String.fromCharCode(pawn.charCodeAt(0) - 1, pawn.charCodeAt(1)));
		moves.push(String.fromCharCode(pawn.charCodeAt(0), pawn.charCodeAt(1) + 1));
		moves.push(String.fromCharCode(pawn.charCodeAt(0), pawn.charCodeAt(1) - 1));
		moves = moves.filter(function(move) {
			return move.search(DISALLOWED_CHARS) === -1 &&
				!isObstructedByWall(pawn, move);
		});
		if (aroundOnly)
			return moves;
		//If a pawn is on the way, we can jump over.
		for (var i = 0; i < moves.length; i++) {
			if (self.pawns.indexOf(moves[i]) !== -1) {
				jump = constructJump(pawn, moves[i]);
				if (!isObstructedByWall(moves[i], jump))
					moves.push(jump);
				else
					moves = moves.concat(constructDiagonalJumps(pawn, moves[i]));
			}
		}
		moves = moves.filter(function(move) {
			return move.search(DISALLOWED_CHARS) === -1 &&
				self.pawns.indexOf(move) === -1;
		});
		return moves;
	};

	function nextTurn() {
		self.whichTurn = (self.whichTurn + 1) % self.pawns.length;
	}

	function prevTurn() {
		self.whichTurn -= 1;
		if (self.whichTurn < 0)
			self.whichTurn = self.pawns.length - 1;
	}

	function isBlockPath(wall) {
		//Temporary add wall to the list and check if path blocked
		self.walls.push(wall);
		for (var i = 0; i < self.pawns.length; i++) {
			var path = pathSearch.search(self.pawns[i], self.chars.lastLines[i]);
			if (path.length === 0) {
				self.walls.pop();
				return true;
			}
		}
		self.walls.pop();
		return false;
	}

	function constructDiagonalJumps(pawn, enemy) {
		var p1 = pawn.charCodeAt(0);
		var p2 = pawn.charCodeAt(1);
		var e1 = enemy.charCodeAt(0);
		var e2 = enemy.charCodeAt(1);
		var move;
		var moves = [];

		if (p1 === e1) {
			move = String.fromCharCode(e1 - 1, e2);
			if (!isObstructedByWall(enemy, move)) moves.push(move);
			move = String.fromCharCode(e1 + 1, e2);
			if (!isObstructedByWall(enemy, move)) moves.push(move);
		} else {
			move = String.fromCharCode(e1, e2 - 1);
			if (!isObstructedByWall(enemy, move)) moves.push(move);
			move = String.fromCharCode(e1, e2 + 1);
			if (!isObstructedByWall(enemy, move)) moves.push(move);
		}
		return moves;
	}

	function isObstructedByWall(pawn, move) {
		var p1 = pawn.charCodeAt(0);
		var p2 = pawn.charCodeAt(1);
		var m1 = move.charCodeAt(0);
		var m2 = move.charCodeAt(1);
		var h = self.chars.h;
		var v = self.chars.v;
		var isVerticalMove = p1 === m1;
		var wall;

		if (isVerticalMove) {
			wall = String.fromCharCode(p1, Math.min(p2, m2), h);
			if (self.walls.indexOf(wall) !== -1)
				return true;
			wall = String.fromCharCode(p1 - 1, Math.min(p2, m2), h);
			return self.walls.indexOf(wall) !== -1;
		} else {
			wall = String.fromCharCode(Math.min(p1, m1), p2, v);
			if (self.walls.indexOf(wall) !== -1)
				return true;
			wall = String.fromCharCode(Math.min(p1, m1), p2 - 1, v);
			return self.walls.indexOf(wall) !== -1;

		}
	}

	function constructJump(pawn, enemy) {
		var p1 = pawn.charCodeAt(0);
		var p2 = pawn.charCodeAt(1);
		var e1 = enemy.charCodeAt(0);
		var e2 = enemy.charCodeAt(1);
		return String.fromCharCode(e1 + (e1 - p1), e2 + (e2 - p2));
	}

	function crossAnotherWall(wall) {
		var intersections = [wall];
		var w1 = wall.charCodeAt(0);
		var w2 = wall.charCodeAt(1);
		var h = self.chars.h;
		var v = self.chars.v;

		if (wall.charAt(2) === 'h') {
			intersections.push(String.fromCharCode(w1 + 1, w2, h));
			intersections.push(String.fromCharCode(w1 - 1, w2, h));
			intersections.push(String.fromCharCode(w1, w2, v));
		} else {
			intersections.push(String.fromCharCode(w1, w2 + 1, v));
			intersections.push(String.fromCharCode(w1, w2 - 1, v));
			intersections.push(String.fromCharCode(w1, w2, h));
		}
		for (var i = 0; i < intersections.length; i++) {
			if (self.walls.indexOf(intersections[i]) !== -1)
				return true;
		}
		return false;
	}
}

function LeePathSearch(game) {
	this.game = game;
	var map = {};

	this.search = function(start, line) {
		var stack = [start];
		var look;
		var neighboors;
		var end;
		var furtherSearch = true, endReached = false;
		var mark = 1;
		var coordinate = isNaN(line) ? 0 : 1;
		if (start.charAt(coordinate) === line)
			return stack;
		//set initial values. All cells equal to 0, except the start point.
		for (var i = game.chars.fv; i <= game.chars.lv; i++)
			for (var j = game.chars.fh; j <= game.chars.lh; j++)
				map[String.fromCharCode(i, j)] = 0;
		map[start] = mark;
		//wave front
		while (furtherSearch) {
			furtherSearch = false;
			mark++;
			look = [];
			while (stack.length > 0 && !endReached) {
				neighboors = this.game.findLegalMoves(stack.pop(), true);
				for (var i = 0; i < neighboors.length; i++) {
					var tmp = neighboors[i];
					if (map[tmp] === 0) {
						map[tmp] = mark;
						look.push(tmp);
						if (tmp.charAt(coordinate) === line) {
							furtherSearch = false;
							endReached = true;
							end = tmp;
							break;
						}
						furtherSearch = true;
					}
				}
			}
			stack = look;
		}
		//Path doesn't exist, return an empty array
		if (!endReached)
			return [];
		//restore the path
		stack = [end];
		while (mark > 1) {
			mark--;
			neighboors = this.game.findLegalMoves(stack[stack.length - 1], true);
			for (var i = 0; i < neighboors.length; i++) {
				var tmp = neighboors[i];
				if (map[tmp] === mark) {
					stack.push(tmp);
					break;
				}
			}
		}
		return stack;
	};
}
;

function UI(game, myId) {
	var game = game;
	var id = myId;
	var WALL_WIDTH = 55;
	var SLOT_WIDTH = 11;
	var showMoves = false;
	var cells = [];
	var pawns = [];

	game.addListener('pawnmoved', onPawnMoved);
	game.addListener('wallput', onWallPut);

	//Images for vertical and horizontal walls
	var possibleWalls = {};
	possibleWalls[game.chars.h] = new createjs.Shape();
	possibleWalls[game.chars.h].graphics.beginFill('coral').rect(0, 0,
		2 * WALL_WIDTH + SLOT_WIDTH, SLOT_WIDTH);
	possibleWalls[game.chars.h].on('click', putWall);
	possibleWalls[game.chars.v] = new createjs.Shape();
	possibleWalls[game.chars.v].graphics.beginFill('coral').rect(0, 0,
		SLOT_WIDTH, 2 * WALL_WIDTH + SLOT_WIDTH);
	possibleWalls[game.chars.v].on('click', putWall);

	var stage = new createjs.Stage('canvas');
	stage.on('stagemousemove', showPossibleWall);

	var wallsDiv = document.getElementById('walls');
	for (var i = 0; i < game.wallLimits.length; i++) {
		var span = document.createElement('span');
		span.textContent = 'Walls: ' + game.wallLimits[i];
		span.id = i;
		wallsDiv.appendChild(span);
	}
	for (var i = game.chars.fv; i <= game.chars.lv; i++)
		for (var j = game.chars.fh; j <= game.chars.lh; j++) {
			var x = i - game.chars.fv;
			var y = 8 - (j - game.chars.fh);
			var cell = createCell(x, y);
			cell.coord = String.fromCharCode(i, j);
			cells.push(cell);
			stage.addChild(cell);
		}
	for (var i = 0; i < game.pawns.length; i++) {
		var pawn = createPawn(i);
		pawn.coord = game.pawns[i];
		pawns.push(pawn);
		stage.addChild(pawn);
	}
	stage.update();

	function showPossibleWall(event) {
		if (game.whichTurn !== id || showMoves)
			return;
		var obj = stage.getObjectUnderPoint(event.stageX, event.stageY);
		var chars = game.chars;
		var needUpdate;
		if (obj !== null) {
			if (obj === possibleWalls[chars.h] ||
			    obj === possibleWalls[chars.v])
				return;
			var needUpdate = stage.contains(possibleWalls[chars.h]) ||
				stage.contains(possibleWalls[chars.v]);
			if (needUpdate) {
				stage.removeChild(possibleWalls[chars.h]);
				stage.removeChild(possibleWalls[chars.v]);
				stage.update();
			}
			return;
		}
		var hCoor = Math.round(event.stageX / (WALL_WIDTH + SLOT_WIDTH));
		var vCoor =  9 - Math.round(event.stageY / (WALL_WIDTH + SLOT_WIDTH));
		var direction = event.stageX % (WALL_WIDTH + SLOT_WIDTH) <=
			SLOT_WIDTH ? chars.v : chars.h;
		var coord = String.fromCharCode(chars.fv - 1 + hCoor,
						chars.fh - 1 + vCoor, direction);
		if (!game.isWallAccepted(coord))
			return;
		var converted = convertCoordToXY(coord);
		var wall = possibleWalls[direction];
		needUpdate = wall.x !== converted.x ||
			wall.y !== converted.y;
		wall.coord = coord;
		wall.x = converted.x;
		wall.y = converted.y;
		if (direction === chars.h) {
			wall.y -= SLOT_WIDTH;
		}
		else {
			wall.x += WALL_WIDTH;
			wall.y -= WALL_WIDTH + SLOT_WIDTH;
		}
		if (direction === chars.h &&
				stage.contains(possibleWalls[chars.v]))
			stage.removeChild(possibleWalls[chars.v]);
		else if (direction === chars.v &&
				stage.contains(possibleWalls[chars.h]))
			stage.removeChild(possibleWalls[chars.h]);
		stage.addChild(wall);
		if (needUpdate)
			stage.update();
	};

	function putWall(event) {
		if (game.whichTurn !== id)
			return;
		game.putWall(event.target.coord, true);
	};

	function onWallPut(position) {
		var horizontal = position.charAt(2) === 'h';
		var chars = game.chars;
		var w = horizontal ?
			possibleWalls[chars.h] : possibleWalls[chars.v];
		var wall = new createjs.Shape();
		if (horizontal)
			wall.graphics.beginFill('brown').rect(0, 0,
			2 * WALL_WIDTH + SLOT_WIDTH, SLOT_WIDTH);
		else
			wall.graphics.beginFill('brown').rect(0, 0,
			SLOT_WIDTH, 2 * WALL_WIDTH + SLOT_WIDTH);
		var converted = convertCoordToXY(position);
		wall.x = converted.x;
		wall.y = converted.y;
		if (horizontal) {
			wall.y -= SLOT_WIDTH;
		}
		else {
			wall.x += WALL_WIDTH;
			wall.y -= WALL_WIDTH + SLOT_WIDTH;
		}
		stage.addChild(wall);
		for (var i = 0; i < game.wallLimits.length; i++) {
			var span = document.getElementById(i);
			span.textContent = 'Walls: ' + game.wallLimits[i];
		}
		stage.update();
	}

	function onPawnMoved(oldPosition, position) {
		//Fill cells with original color back
		game.undoMovePawn(oldPosition);
		var moves = game.findLegalMoves(oldPosition);
		game.weakMovePawn(position);
		for (var i = 0; i < moves.length; i++) {
			var cell = cells.find(function (item, index, arr) {
				return item.coord === moves[i];
			});
			cell.graphics.beginFill('white').rect(0, 0,
					WALL_WIDTH, WALL_WIDTH);
		}
		//Move pawn shape
		var pawn = pawns.find(function (item, index, arr) {
			return item.coord === oldPosition;
		});
		var convertedCoord = convertCoordToXY(position);
		pawn.x = convertedCoord.x;
		pawn.y = convertedCoord.y;
		pawn.coord = position;
		showMoves = false;
		stage.update();
	}

	function createPawn(id) {
		var color = ['green', 'blue'];
		var coord = game.pawns[id];
		var pawn = new createjs.Shape();
		pawn.graphics.beginFill(color[id]).drawEllipse(0, 0,
				WALL_WIDTH, WALL_WIDTH);
		var convertedCoord = convertCoordToXY(coord);
		pawn.x = convertedCoord.x;
		pawn.y = convertedCoord.y;
		return pawn;
	};

	function createCell(x, y) {
		var cell = new createjs.Shape();
		cell.graphics.beginFill('white').rect(0, 0, WALL_WIDTH,
					WALL_WIDTH);
		cell.x = SLOT_WIDTH + x * (WALL_WIDTH + SLOT_WIDTH);
		cell.y = SLOT_WIDTH + y * (WALL_WIDTH + SLOT_WIDTH);
		cell.on('click', cellClicked);
		return cell;
	}

	function cellClicked(event) {
		if (game.whichTurn !== id)
			return;
		if (game.pawns.indexOf(event.target.coord) === id) {
			showLegalMoves(event.target.coord);
			return;
		}
		//Moves are being showed. Likely user wants the pawn. If the
		//move is accepted then onPawnMoved will be called. It will call
		//stage.update() if it is needed.
		if (showMoves)
			game.movePawn(event.target.coord, true);
	}

	function showLegalMoves(pawn) {
		showMoves = !showMoves;
		var color = showMoves ? 'yellow' : 'white';
		var moves = game.findLegalMoves(pawn);
		for (var i = 0; i < moves.length; i++) {
			var cell = cells.find(function (item, index, arr) {
				return item.coord === moves[i];
			});
			cell.graphics.beginFill(color).rect(0, 0,
					WALL_WIDTH, WALL_WIDTH);
		}
		stage.update();
	}

	function convertCoordToXY(coord) {
		return {
			x: (coord.charCodeAt(0) - game.chars.fv)
			   * (WALL_WIDTH + SLOT_WIDTH) + SLOT_WIDTH,
			y: (8 - (coord.charCodeAt(1) - game.chars.fh))
			   * (WALL_WIDTH + SLOT_WIDTH) + SLOT_WIDTH
		};
	}
}

function AIProxy(game, id) {
	var game = game;
	var id = id;
	var ai = new AI(id, game);
	var maxDepth = 2;
	ai.setDepth(maxDepth);

	this.searchMove = function() {
		if (game.whichTurn !== id)
			return;
		ai.search(maxDepth, Number.MIN_SAFE_INTEGER,
			Number.MAX_SAFE_INTEGER);
	};
}

function AI(id, game) {
	var id = id;
	var game = game;
	var pathSearch = new LeePathSearch(game);
	var ALL_WALLS = [];
	var maxDepth;

	for (var i = game.chars.fv; i < game.chars.lv; i++)
		for (var j = game.chars.fh; j < game.chars.lh; j++) {
			ALL_WALLS.push(String.fromCharCode(i, j, game.chars.h));
			ALL_WALLS.push(String.fromCharCode(i, j, game.chars.v));
		}

	this.setDepth = function(depth) {
		maxDepth = depth;
	};

	this.search = function(depth, alpha, beta, bestMove) {
		var minMax = game.whichTurn === id ? Number.MIN_SAFE_INTEGER
			: Number.MAX_SAFE_INTEGER;
		if (depth === 0 || isTerminalState()) {
			var temp = heuristic();
			return temp;
		}
		var actions = generateAllActions(game.pawns[game.whichTurn]);
		var score;
		var oldPosition;
		for (var i = 0; i < actions.length; i++) {
			var action = actions[i];
			if (action.length === 2) {
				//Action is pawn movement
				oldPosition = game.pawns[game.whichTurn];
				game.weakMovePawn(action);
			}
			else {
				game.weakPutWall(action);
			}
			score = this.search(depth - 1, alpha, beta);
			if (action.length === 2) {
				//Action was pawn movement
				game.undoMovePawn(oldPosition);
			}
			else {
				game.undoPutWall();
			}
			if ((score > minMax && game.whichTurn === id) ||
				(score <= minMax && game.whichTurn !== id)) {
				minMax = score;
				bestMove = actions[i];
			}
			if (game.whichTurn === id)
				alpha = Math.max(alpha, score);
			else
				beta = Math.min(beta, score);
			if (beta < alpha)
				break;
		}
		if (!bestMove) {
			var temp = heuristic();
			return temp;
		}
		if (depth === maxDepth)
			if (bestMove.length === 2)
				game.movePawn(bestMove);
			else
				game.putWall(bestMove);
		return minMax;
	};

	function isTerminalState() {
		
		var coordinate;
		for (var i = 0; i < game.pawns.length; i++) {
			coordinate = (i <= 1) ? 1 : 0;
			if (game.pawns[i].charAt(coordinate) === game.chars.lastLines[i])
				return true;
		}
		return false;
	}

	function heuristic() {
		var score = 0;
		var path;
		for (var i = 0; i < game.pawns.length; i++) {
			var path = pathSearch.search(game.pawns[i], game.chars.lastLines[i]);
			//Score must be greater by absolute value than path
			//length in terminal state.
			//"length - 1" because path contains current position.
			var temp = (path.length === 1) ? -100 : path.length - 1;
			if (i === id)
				score -= temp;
			else
				score += temp;
		}
		return score;
	}

	//Return an array of legal pawn movements and wall placements (if the
	//latter is possible)
	function generateAllActions(pawn) {
		var actions = game.findLegalMoves(pawn);
		var check = false;
		if (game.wallLimits[game.whichTurn] === 0)
			return actions;
		return actions.concat(ALL_WALLS.filter(function(wall) {
			for (var i = 0; i < game.walls.length; i++) {
				if (Math.max(Math.abs(wall.charCodeAt(0) -
					game.walls[i].charCodeAt(0)), Math.abs(wall.charCodeAt(1) -
					game.walls[i].charCodeAt(1))) < 3) {
						check = true;
						break;
					}
			}
			return check && game.isWallAccepted(wall);
		}));
	}
}

function start() {
	var game = new Game(2);
	var ui = new UI(game, 0);
	var ai = new AIProxy(game, 1);

	game.addListener('pawnmoved', triggerAI);
	game.addListener('wallput', triggerAI);

	function triggerAI() {
		if (game.whichTurn !== 0)
			setTimeout(aiStart, 50);
	}

	function aiStart() {
		ai.searchMove();
	}
}
