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

  const puzzleDataStore = persisted("puzzles.data", {});

  function averageOfLastThree(times) {
    if (times.length === 0) {
      return 0;
    }
    const lastThree = times.slice(-3);
    const sum = lastThree.reduce((a, b) => a + b, 0);
    return sum / (lastThree.length || 1);
  }

  let sortedPuzzleIds;
  $: {
    sortedPuzzleIds = [...currentPuzzleIds].sort((a, b) => {
      const timesA = $solveTimes[a] || [];
      const timesB = $solveTimes[b] || [];

      // If puzzle A has no times, it should come after puzzle B
      if (timesA.length === 0) return 1;
      // If puzzle B has no times, it should come after puzzle A
      if (timesB.length === 0) return -1;

      const avgTimeA = averageOfLastThree(timesA);
      const avgTimeB = averageOfLastThree(timesB);
      return avgTimeA - avgTimeB;
    });
  }

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
  let completedPuzzleIds = [];
  let currentPuzzleId;
  let puzzleShownAt;

  let batchSize = 10;
  let timeGoal = 15000;
  let minimumSolves = 3;

  function setCompletedPuzzles() {
    const all = $puzzleIdsToWorkOn;
    completedPuzzleIds = all.filter((id) => {
      const times = $solveTimes[id] || [];
      if (times.length < 3) {
        return false;
      }
      const lastThreeSolves = times.slice(-3);
      let averageTime =
        lastThreeSolves.reduce((a, b) => a + b, 0) / lastThreeSolves.length;

      return averageTime <= timeGoal;
    });
  }

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
    if ($puzzleDataStore[currentPuzzleId]) {
      return $puzzleDataStore[currentPuzzleId];
    }
    const response = await fetch(
      `https://lichess.org/api/puzzle/${currentPuzzleId}`,
    );
    if (response.status === 404) {
      removePuzzleId(currentPuzzleId);
      return getNextPuzzle();
    }
    const puzzleData = await response.json();
    const data = $puzzleDataStore;
    data[currentPuzzleId] = puzzleData;
    puzzleDataStore.set(data);
    return puzzleData;
  }

  let moves;
  let position;
  let madeMistake = false;
  let puzzleComplete = false;
  let nextButton;

  async function skip() {
    await loadNextPuzzle();
  }

  async function loadNextPuzzle() {
    puzzleComplete = false;
    madeMistake = false;

    const next = await getNextPuzzle();
    orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1);
    // Clone so we don't cache a value that gets shifted later
    moves = [...next.puzzle.solution];

    const pgn = parsePgn(next.game.pgn)[0];

    position = startingPosition(pgn.headers).unwrap();
    const allNodes = [...pgn.moves.mainlineNodes()];

    for (let i = 0; i < allNodes.length - 1; i++) {
      const node = allNodes[i];
      const move = parseSan(position, node.data.san);
      position.play(move);
    }

    const lastMove = parseSan(position, allNodes[allNodes.length - 1].data.san);

    setChessgroundFromPosition();

    setTimeout(() => {
      position.play(lastMove);
      chessground.move(makeSquare(lastMove.from), makeSquare(lastMove.to));
      updateLegalMoves();
      puzzleShownAt = Util.currentMicrotime();
    }, 300);
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
    let move = { from: origSquare, to: destSquare };
    if (
      chessground.state.pieces.get(dest)?.role === "pawn" &&
      (dest[1] === "1" || dest[1] === "8")
    ) {
      move = { ...move, promotion: "queen" };
      chessground.setPieces(
        new Map([[dest, { color: orientation, role: "queen" }]]),
      );
    }
    const uciMove = makeUci(move);
    if (wouldBeCheckmate(orig, dest)) {
      return handlePuzzleComplete();
    }
    if (uciMove === correctMove) {
      position.play(move);
      moves.shift(); // remove the user move first
      const computerMove = moves.shift();
      if (computerMove) {
        const move = parseUci(computerMove);
        position.play(move);
        chessground.move(makeSquare(move.from), makeSquare(move.to));
        updateLegalMoves();
      } else {
        return handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      showFailure("Nope!");
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
    showSuccess("Correct!");
    setActivePuzzleIds();
    setCompletedPuzzles();
  }

  function addSolveTime(puzzleId, time) {
    const times = $solveTimes;
    const timesForPuzzle = times[puzzleId] || [];

    timesForPuzzle.push(time);
    times[puzzleId] = timesForPuzzle;
    solveTimes.set(times);
  }

  let successMessage = null;

  function showSuccess(message, duration = 1500) {
    failureMessage = null;
    successMessage = message;
    setTimeout(() => {
      successMessage = null;
    }, duration);
  }

  let failureMessage = null;

  function showFailure(message, duration = 1000) {
    successMessage = null;
    failureMessage = message;
    setTimeout(() => {
      failureMessage = null;
    }, duration);
  }

  onMount(async () => {
    setCompletedPuzzles();
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
          <div slot="centered-content">
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
            {#if !puzzleComplete}
              <div class="block is-flex is-justify-content-center">
                <span class="tag is-{orientation} is-size-4"
                  >{orientation} to play</span
                >
                <button class="button is-primary" on:click={skip}>Skip</button>
              </div>
            {/if}
          </div>
        </Chessboard>
      {:else}
        <p>All puzzles complete, add some more!</p>
      {/if}
    </div>
  </div>
  <div class="column is-2-desktop">
    <div class="box">
      <div class="block">
        <a
          class="button is-link ml-3"
          href={`https://lichess.org/training/${currentPuzzleId}`}
          target="_blank"
        >
          View on lichess
        </a>
      </div>
      <div class="block is-flex is-justify-content-center"></div>
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
      {#if completedPuzzleIds}
        <div class="block">
          Done with {completedPuzzleIds.length} puzzles
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
    {#if sortedPuzzleIds.length >= 1}
      <div class="box">
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th><abbr title="Lichess Puzzle ID">ID</abbr></th>
              <th><abbr title="Average solve time">Avg</abbr></th>
              <th><abbr title="Total Solves">Solves</abbr></th>
            </tr>
          </thead>
          <tbody>
            {#each sortedPuzzleIds as puzzleId (puzzleId)}
              <tr
                animate:flip={{ duration: 400 }}
                class:is-selected={currentPuzzleId === puzzleId}
              >
                <td class="puzzle-id">{puzzleId}</td>
                {#if $solveTimes[puzzleId]}
                  <td>
                    {(
                      $solveTimes[puzzleId]
                        .slice(-3)
                        .reduce((a, b) => a + b, 0) /
                      $solveTimes[puzzleId].slice(-3).length /
                      1000
                    ).toFixed(2)}s
                  </td>
                  <td>
                    {$solveTimes[puzzleId].length}
                  </td>
                {:else}
                  <td>?</td>
                  <td>?</td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }
</style>
