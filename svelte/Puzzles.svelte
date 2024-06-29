<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Util } from "src/util";
  import { parsePgn, startingPosition } from "chessops/pgn";
  import { parseSan } from "chessops/san";
  import { Chess, makeUci, parseUci } from "chessops";
  import { makeSquare, parseSquare } from "chessops/util";
  import { persisted } from "svelte-persisted-store";

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

  const puzzleIdsToWorkOn = persisted("puzzles.idsToWorkOn", [
    "EUB6t",
    "RxzYi",
    "MX2SS",
    "UiyYS",
    "r8hk8",
  ]);

  let newPuzzleIds;

  function addPuzzleIdToWorkOn() {
    if (newPuzzleIds.length < 3) {
      newPuzzleIds = "";
      return;
    }
    const idsToAdd = newPuzzleIds.split(",").map((id) => id.trim());
    const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
    idsToAdd.forEach((id) => currentPuzzleIds.add(id));
    puzzleIdsToWorkOn.set([...currentPuzzleIds]);
    newPuzzleIds = "";
    setActivePuzzleIds();
  }

  function removePuzzleId(puzzleId) {
    const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
    currentPuzzleIds.delete(puzzleId.trim());
    puzzleIdsToWorkOn.set([...currentPuzzleIds]);
  }

  const solveTimes = persisted("puzzles.solveTimes", {});

  let currentPuzzleIds = [];
  let currentPuzzleId;
  let puzzleShownAt;
  let puzzleIndex = 0;

  let batchSize = 10;
  let timeGoal = 15000;
  let minimumSolves = 3;

  function setActivePuzzleIds() {
    const all = $puzzleIdsToWorkOn;
    let selectedPuzzles = [];

    for (let puzzleId of all) {
      let times = $solveTimes[puzzleId] || [];

      if (times.length < minimumSolves) {
        selectedPuzzles.push(puzzleId);
      } else {
        let lastThreeSolves = times.slice(-3);
        let averageTime =
          lastThreeSolves.reduce((a, b) => a + b, 0) / lastThreeSolves.length;

        if (averageTime > timeGoal) {
          selectedPuzzles.push(puzzleId);
        }
      }

      if (selectedPuzzles.length >= batchSize) {
        break;
      }
    }

    currentPuzzleIds = selectedPuzzles;
  }

  async function getNextPuzzle() {
    const previous = currentPuzzleId;
    currentPuzzleId = Util.getRandomElement(currentPuzzleIds);
    if (currentPuzzleIds.length > 1 && currentPuzzleId === previous) {
      return getNextPuzzle();
    }
    const response = await fetch(
      `https://lichess.org/api/puzzle/${currentPuzzleId}`,
    );
    if (response.status === 404) {
      removePuzzleId(currentPuzzleId);
      return getNextPuzzle();
    }
    return await response.json();
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
    if (!madeMistake) {
      addSolveTime(currentPuzzleId, timeToSolve);
    }
    setActivePuzzleIds();
  }

  function addSolveTime(puzzleId, time) {
    const times = $solveTimes;
    const timesForPuzzle = times[puzzleId] || [];

    timesForPuzzle.push(time);
    times[puzzleId] = timesForPuzzle;
    solveTimes.set(times);
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
    setActivePuzzleIds();
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
      {#if currentPuzzleIds.length > 0 && currentPuzzleId}
        <Chessboard {chessgroundConfig} {orientation} bind:chessground>
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
                <a
                  class="button is-link ml-3"
                  href={`https://lichess.org/training/${currentPuzzleId}`}
                  target="_blank">View on lichess</a
                >
              </div>
            {/if}
          </div>
        </Chessboard>
        {#if !puzzleComplete}
          <div class="block is-flex is-justify-content-center">
            <span class="tag is-{orientation} is-size-4"
              >{orientation} to play</span
            >
          </div>
        {/if}
      {:else}
        <p>All puzzles complete, add some more!</p>
      {/if}
    </div>
  </div>
  <div class="column is-2-desktop">
    <div class="box">
      <div class="block is-flex is-justify-content-center">
        {#if successMessage}
          <span in:fade class="tag is-success is-size-4">
            {successMessage}
          </span>
        {/if}
        {#if failureMessage}
          <span in:fade class="tag is-danger is-size-4">
            {failureMessage}
          </span>
        {/if}
      </div>
    </div>
    <div class="box">
      <div class="block">
        {$puzzleIdsToWorkOn.length} total puzzles
      </div>
      {#if currentPuzzleIds}
        <div class="block">
          Currently working on {currentPuzzleIds.length} puzzles
        </div>
      {/if}
      <div class="block">
        <form on:submit|preventDefault={addPuzzleIdToWorkOn}>
          <label for="newPuzzleId">New Puzzle ID(s):</label>
          <input
            type="text"
            id="newPuzzleId"
            bind:value={newPuzzleIds}
            placeholder=""
          />
          <button class="button is-primary" type="submit">Add</button>
        </form>
      </div>
    </div>
    <div class="box">
      {#if currentPuzzleIds.length >= 1}
        <ul>
          {#each currentPuzzleIds as puzzleId (puzzleId)}
            <li animate:flip class:current={currentPuzzleId === puzzleId}>
              <span class="puzzle-id">{puzzleId}</span>
              {#if $solveTimes[puzzleId]}
                - {(
                  $solveTimes[puzzleId].slice(-3).reduce((a, b) => a + b, 0) /
                  $solveTimes[puzzleId].slice(-3).length /
                  1000
                ).toFixed(2)}s - {$solveTimes[puzzleId].length}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }

  .current {
    font-weight: bold;
  }
</style>
