<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { Util } from "src/util";
  import { parsePgn, startingPosition } from "chessops/pgn";
  import { parseSan } from "chessops/san";
  import { Chess, makeUci, parseUci } from "chessops";
  import { makeSquare, parseSquare } from "chessops/util";

  let fen;
  let chessground;
  let orientation = "white";
  let chessgroundConfig = {
    fen: INITIAL_FEN,
    coordinates: true,
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
    orientation: orientation,
  };
  let boardSize;

  let puzzleIds = ["EUB6t", "RxzYi", "MX2SS", "UiyYS", "r8hk8"];

  let puzzleShownAt;
  let puzzleIndex = 0;

  async function getNextPuzzle() {
    const puzzleId = puzzleIds[puzzleIndex];
    const response = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`);
    const data = await response.json();
    // Loop
    puzzleIndex = (puzzleIndex + 1) % puzzleIds.length;

    return data;
  }

  let moves;
  let position;
  let madeMistake = false;
  let puzzleComplete = false;
  let nextButton;

  async function loadNextPuzzle() {
    puzzleComplete = false;
    madeMistake = false;

    const next = await getNextPuzzle();
    orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1);
    moves = next.puzzle.solution;

    const pgn = parsePgn(next.game.pgn)[0];

    position = startingPosition(pgn.headers).unwrap();
    const allNodes = [...pgn.moves.mainlineNodes()];

    allNodes.forEach((node) => {
      const move = parseSan(position, node.data.san);
      position.play(move);
    });

    setChessgroundFromPosition();
    puzzleShownAt = Util.currentMicrotime();
  }

  function setChessgroundFromPosition() {
    fen = makeFen(position.toSetup());
    chessground.set({
      fen: fen,
    });
    updateLegalMoves();
  }

  function updateLegalMoves() {
    fen = makeFen(position.toSetup());
    const legalMoves = getLegalMovesForFen(fen);
    chessground.set({
      movable: {
        dests: legalMoves,
      },
    });
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

  function handleUserMove(orig, dest) {
    const correctMove = moves[0];
    const origSquare = parseSquare(orig);
    const destSquare = parseSquare(dest);
    const uciMove = makeUci({ from: origSquare, to: destSquare });
    if (wouldBeCheckmate(orig, dest)) {
      return handlePuzzleComplete();
    }
    if (uciMove === correctMove) {
      position.play({ from: origSquare, to: destSquare });
      moves.shift(); // remove the user move first
      const computerMove = moves.shift();
      if (computerMove) {
        const move = parseUci(computerMove);
        position.play(move);
        chessground.move(makeSquare(move.from), makeSquare(move.to));
        updateLegalMoves();
        showSuccess("Correct!");
      } else {
        return handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      showFailure("Not the move!");
      setTimeout(() => {
        setChessgroundFromPosition();
      }, 200);
    }
  }

  function wouldBeCheckmate(orig, dest) {
    const origSquare = parseSquare(orig);
    const destSquare = parseSquare(dest);
    const clonedPosition = position.clone();
    clonedPosition.play({ from: origSquare, to: destSquare });
    return clonedPosition.isCheckmate();
  }

  function handlePuzzleComplete() {
    puzzleComplete = true;
    const timeToSolve = Util.currentMicrotime() - puzzleShownAt;
  }

  let successMessage = null;

  function showSuccess(message, duration = 2000) {
    failureMessage = null;
    successMessage = message;
    setTimeout(() => {
      successMessage = null;
    }, duration);
  }

  let failureMessage = null;

  function showFailure(message, duration = 2000) {
    successMessage = null;
    failureMessage = message;
    setTimeout(() => {
      failureMessage = null;
    }, duration);
  }

  onMount(async () => {
    document.addEventListener("keydown", function (event) {
      if (["Enter", " "].includes(event.key) && nextButton) {
        nextButton.click();
      }
    });
    await loadNextPuzzle();
  });
</script>

<div class="columns is-centered">
  <div class="column is-6-desktop">
    <div class="block">
      <Chessboard
        {chessgroundConfig}
        {orientation}
        bind:chessground
        bind:size={boardSize}
      >
        <div slot="below-board">
          {#if puzzleComplete}
            <div class="block is-flex is-justify-content-center">
              <button
                class="button is-primary"
                bind:this={nextButton}
                on:click={async () => {
                  await loadNextPuzzle();
                }}
                >Next
              </button>
            </div>
          {/if}
        </div>
      </Chessboard>
    </div>
  </div>
  <div class="column is-2-desktop">
    <div class="box">
      <div class="block is-flex is-justify-content-center">
        {#if successMessage}
          <span transition:fade class="tag is-success is-size-4">
            {successMessage}
          </span>
        {/if}
        {#if failureMessage}
          <span transition:fade class="tag is-danger is-size-4">
            {failureMessage}
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>
