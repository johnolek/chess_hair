<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import Chessboard from "./components/Chessboard.svelte";

  import { parsePgn, startingPosition } from "chessops/pgn";
  import { Util } from "src/util";
  import { getRandomGame } from "src/random_games";
  import { makeSan, parseSan } from "chessops/san";
  import { makeFen, parseFen } from "chessops/fen";
  import { makeSquare, parseSquare } from "chessops/util";
  import { persisted } from "svelte-persisted-store";
  import ProgressTimer from "./components/ProgressTimer.svelte";
  import { Chess } from "chessops";

  const orientation = persisted("notation.orientation", "white");

  let correctCount = 0;
  let incorrectCount = 0;
  let nextMove;
  let colorToMove;

  let positionShownAt;

  class Answer {
    constructor(givenAnswer, correctAnswer, timeToAnswer, orientation) {
      this.givenAnswer = givenAnswer;
      this.correctAnswer = correctAnswer;
      this.timeToAnswer = timeToAnswer;
      this.orientation = orientation;
    }

    isCorrect() {
      return this.givenAnswer === this.correctAnswer;
    }
  }

  /** @type {Answer[]} */
  let answers = [];

  let chessgroundConfig = {
    fen: "8/8/8/8/8/8/8/8",
    coordinates: false,
    animation: {
      enabled: true,
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    draggable: {
      enabled: true,
    },
    selectable: {
      enabled: true,
    },
    movable: {
      free: false,
      color: "both",
      dests: new Map(),
      events: {
        after: handleUserMove,
      },
    },
    orientation: $orientation,
  };
  let boardSize;
  let chessground;
  let fen;

  // Game stuff
  let gameRunning = false;
  let highScoreWhite = 0;
  let highScoreBlack = 0;
  let maxTime = 0;
  let correctBonus = 0;
  let incorrectPenalty = 10;

  function handleUserMove(orig, dest) {
    const setup = parseFen(fen).unwrap();
    const chess = Chess.fromSetup(setup).unwrap();

    const origSquare = parseSquare(orig);
    const destSquare = parseSquare(dest);

    const move = { from: origSquare, to: destSquare };

    const san = makeSan(chess, move);
    handleAnswer(san, nextMove);
  }

  let flashMessageTimeout = null;
  let showFlashMessage = false;
  let flashMessage;
  let flashType;

  function flash(message, type, duration = 2000) {
    clearTimeout(flashMessageTimeout);
    // Make sure we clear away any existing message
    showFlashMessage = false;

    flashMessage = message;
    flashType = type;
    showFlashMessage = true;

    flashMessageTimeout = setTimeout(() => {
      flashMessage = null;
      flashType = null;
      showFlashMessage = false;
    }, duration);
  }

  function newPosition() {
    const game = getRandomGame();
    const pgnGame = parsePgn(game.pgn)[0];
    const totalPlies = [...pgnGame.moves.mainline()].length;

    const random = Util.getRandomIntBetween(1, totalPlies - 1);
    const positionResult = startingPosition(pgnGame.headers);
    const position = positionResult.unwrap();
    const allNodes = [...pgnGame.moves.mainlineNodes()];
    const previousMove = nextMove;
    const candidateMove = allNodes[random].data.san;

    if (
      candidateMove.includes("=") || // no promotions
      candidateMove === previousMove || // do not repeat moves
      whoseMoveIsIt(random) !== $orientation || // only show moves for current view
      ["O-O", "O-O-O"].includes(candidateMove) // no castles
    ) {
      return newPosition();
    }

    nextMove = candidateMove;

    colorToMove = whoseMoveIsIt(random);

    let i;
    let move;

    for (i = 0; i < random; i++) {
      const node = allNodes[i];
      move = parseSan(position, node.data.san);
      position.play(move);
    }

    // Bound to Chessboard, automatically updates
    fen = makeFen(position.toSetup());
    const legalMoves = getLegalMovesForFen(fen);

    chessground.set({
      movable: {
        dests: legalMoves,
      },
    });
    positionShownAt = new Date().getTime();
  }

  function whoseMoveIsIt(ply) {
    return ply % 2 === 0 ? "white" : "black";
  }

  function handleAnswer(userSan, answerSan) {
    const isCorrect = userSan === answerSan;
    correctBonus = correctBonus * 0.98;
    let timeToAnswer = new Date().getTime() - positionShownAt;
    answers = [
      ...answers,
      new Answer(userSan, answerSan, timeToAnswer, $orientation),
    ];
    if (isCorrect) {
      maxTime += correctBonus;
      flash("Correct!", "success");
      correctCount++;
    } else {
      maxTime -= incorrectPenalty;
      flash(`Not ${userSan} :(`, "danger");
      incorrectCount++;
    }
    newPosition();
  }

  function startGame() {
    answers = [];
    gameRunning = true;
    maxTime = 30;
    correctCount = 0;
    incorrectCount = 0;
    correctBonus = 1.33;
    newPosition();
  }

  function endGame() {
    gameRunning = false;
    if ($orientation === "white") {
      if (correctCount > highScoreWhite) {
        highScoreWhite = correctCount;
      }
    } else {
      if (correctCount > highScoreBlack) {
        highScoreBlack = correctCount;
      }
    }
  }

  function getLegalMovesForFen(fen) {
    const setup = parseFen(fen).unwrap();
    const chess = Chess.fromSetup(setup).unwrap();
    const destsMap = chess.allDests();

    const destsMapInSan = new Map();

    for (const [key, value] of destsMap.entries()) {
      const destsArray = Array.from(value).map((sq) => makeSquare(sq));
      destsMapInSan.set(makeSquare(key), destsArray);
    }

    return destsMapInSan;
  }

  onMount(() => {
    newPosition();
  });
</script>

<div class="columns is-centered">
  <div class="column is-6-desktop">
    <div class="block">
      <div
        class="block is-flex is-justify-content-center"
        style="width: {boardSize}px; position: relative;"
      >
        <span class="tag is-size-3 is-{colorToMove}">
          {nextMove}
        </span>
        {#if showFlashMessage}
          <span
            transition:fade
            style="position: absolute; right: 0"
            class="tag is-size-3 is-{flashType}"
          >
            {flashMessage}
          </span>
        {/if}
      </div>
      <Chessboard
        {chessgroundConfig}
        bind:fen
        bind:chessground
        orientation={$orientation}
        bind:size={boardSize}
      />
    </div>
    {#if gameRunning}
      <ProgressTimer max={maxTime} width={boardSize} on:complete={endGame}
      ></ProgressTimer>
    {/if}
  </div>
  <div class="column is-2-desktop">
    {#if !gameRunning}
      <div class="block">
        {#if $orientation === "white"}
          <button
            class="button is-small"
            on:click={() => {
              orientation.set("black");
            }}
            >View as black
          </button>
        {:else}
          <button
            class="button is-small"
            on:click={() => {
              orientation.set("white");
            }}
            >View as white
          </button>
        {/if}
      </div>
    {/if}
    {#if !gameRunning}
      <div class="block">
        <button class="button is-small" on:click={startGame}>Start Game</button>
      </div>
    {/if}
    <div class="block">
      <p>Correct: {correctCount}</p>
      <p>Incorrect: {incorrectCount}</p>
      <p>High Score (white): {highScoreWhite}</p>
      <p>High Score (black): {highScoreBlack}</p>
    </div>
  </div>
</div>
