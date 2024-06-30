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

  class Result {
    constructor(puzzleId, seenAt, skipped, madeMistake = false, doneAt = null) {
      this.puzzleId = puzzleId;
      this.skipped = skipped;
      this.madeMistake = madeMistake;
      this.seenAt = seenAt;
      this.doneAt = doneAt;
    }

    getDuration() {
      if (this.doneAt) {
        return this.doneAt - this.seenAt;
      }
    }

    wasSuccessful() {
      return !this.skipped && !this.madeMistake && this.doneAt;
    }
  }

  class Puzzle {
    constructor(puzzleId) {
      this.puzzleId = puzzleId;
    }

    lichessUrl() {
      return `https://lichess.org/training/${this.puzzleId}`;
    }

    hasResults() {
      return this.getResults().length >= 1;
    }

    hasBeenSolved() {
      if (!this.hasResults()) {
        return false;
      }
      return this.getResults().some((result) => {
        return result.wasSuccessful();
      });
    }

    getResults() {
      return ($results[this.puzzleId] || []).map(
        (resultData) =>
          new Result(
            resultData.puzzleId,
            resultData.seenAt,
            resultData.skipped,
            resultData.madeMistake,
            resultData.doneAt,
          ),
      );
    }

    getTotalSolves() {
      return this.getResults().filter((result) => result.wasSuccessful())
        .length;
    }

    averageSolveTime() {
      if (!this.hasBeenSolved()) {
        return null;
      }
      const successfulResults = this.getResults().filter((result) =>
        result.wasSuccessful(),
      );
      const lastFew = successfulResults.slice(minimumSolves * -1);
      const durations = lastFew.map((result) => result.getDuration());
      const sum = durations.reduce((a, b) => a + b, 0);
      const average = sum / (lastFew.length || 1);
      return average;
    }

    lastSeenAt() {
      if (!this.hasResults()) {
        return null;
      }

      return this.getResults().slice(-1).seenAt;
    }

    isComplete() {
      if (!this.hasBeenSolved()) {
        return false;
      }
      const lastSolves = this.getResults().slice(-1 * minimumSolves);

      if (lastSolves.length < minimumSolves) {
        return false;
      }

      if (!lastSolves.every((result) => result.wasSuccessful())) {
        return false;
      }

      return this.averageSolveTime() <= timeGoal;
    }
  }

  // Chess board stuff
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

  // Puzzle Data
  let allPuzzles = [];
  let activePuzzles = [];
  let currentPuzzleId;
  let puzzleShownAt;

  // Behavioral Config
  let batchSize = 10;
  let timeGoal = 15000;
  let minimumSolves = 3;
  let alreadyCompleteOdds = 0.1;
  let otherIncompleteOdds = 0.1;

  // Current puzzle state
  let moves;
  let position;
  let madeMistake = false;
  let puzzleComplete = false;

  // DOM elements
  let nextButton;

  // Persisted data
  const puzzleDataStore = persisted("puzzles.data", {});
  const puzzleIdsToWorkOn = persisted("puzzles.idsToWorkOn", []);
  const results = persisted("puzzles.results", {});

  // This is tied to the add new puzzle form
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
    setActivePuzzles();
  }

  function removePuzzleId(puzzleId) {
    const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
    currentPuzzleIds.delete(puzzleId.trim());
    puzzleIdsToWorkOn.set([...currentPuzzleIds]);
  }

  function setActivePuzzles() {
    const incomplete = [...allPuzzles].filter((puzzle) => {
      return !puzzle.isComplete();
    });

    activePuzzles = incomplete.slice(0, batchSize);
  }

  function completedPuzzles() {
    return allPuzzles.filter((puzzle) => puzzle.isComplete());
  }

  function inactiveIncompletePuzzles() {
    return allPuzzles.filter(
      (puzzle) => !puzzle.isComplete() && !activePuzzles.includes(puzzle),
    );
  }

  function sortPuzzlesBySolveTime(a, b) {
    const aTime = a.averageSolveTime();
    const bTime = b.averageSolveTime();

    if (aTime === null && bTime === null) {
      return 0;
    }
    if (aTime === null) {
      return 1;
    }
    if (bTime === null) {
      return -1;
    }
    return aTime - bTime;
  }

  async function getNextPuzzle() {
    const previous = currentPuzzleId;
    const nextType = getNextPuzzleType();
    let candidatePuzzle;
    switch (nextType) {
      case "active":
        candidatePuzzle = Util.getRandomElement(activePuzzles);
        break;
      case "inactive":
        const inactivePuzzles = inactiveIncompletePuzzles();
        candidatePuzzle =
          inactivePuzzles.length > 0
            ? Util.getRandomElement(inactivePuzzles)
            : Util.getRandomElement(activePuzzles);
        break;
      case "alreadyComplete":
        const completePuzzles = completedPuzzles();
        candidatePuzzle =
          completePuzzles.length > 0
            ? Util.getRandomElement(completePuzzles)
            : Util.getRandomElement(activePuzzles);
        break;
    }
    if (activePuzzles.length > 1 && candidatePuzzle.puzzleId === previous) {
      return getNextPuzzle();
    }

    currentPuzzleId = candidatePuzzle.puzzleId;

    // Check cache first
    if ($puzzleDataStore[currentPuzzleId]) {
      return $puzzleDataStore[currentPuzzleId];
    }

    const response = await fetch(
      `https://lichess.org/api/puzzle/${currentPuzzleId}`,
    );

    if (response.status === 404) {
      // Remove invalid
      removePuzzleId(currentPuzzleId);
      return getNextPuzzle();
    }

    const puzzleData = await response.json();
    const data = $puzzleDataStore;
    data[currentPuzzleId] = puzzleData;
    puzzleDataStore.set(data);
    return puzzleData;
  }

  function getNextPuzzleType() {
    const randomValue = Math.random();

    if (randomValue < alreadyCompleteOdds) {
      return "alreadyComplete";
    } else if (randomValue < alreadyCompleteOdds + otherIncompleteOdds) {
      return "inactive";
    } else {
      return "active";
    }
  }

  async function skip() {
    const result = new Result(currentPuzzleId, puzzleShownAt, true);
    addResult(currentPuzzleId, result);
    await loadNextPuzzle();
  }

  function addResult(puzzleId, result) {
    const allResults = $results;
    const existingResults = $results[puzzleId] || [];
    existingResults.push(result);
    allResults[puzzleId] = existingResults;
    results.set(allResults);
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
    const result = new Result(
      currentPuzzleId,
      puzzleShownAt,
      false,
      madeMistake,
      Util.currentMicrotime(),
    );
    addResult(currentPuzzleId, result);
    showSuccess("Correct!");
    setActivePuzzles();
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

  function initializePuzzles() {
    allPuzzles = [];
    $puzzleIdsToWorkOn.forEach((puzzleId) => {
      allPuzzles.push(new Puzzle(puzzleId));
    });
  }

  onMount(async () => {
    initializePuzzles();
    setActivePuzzles();
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
      {#if activePuzzles.length > 0 && currentPuzzleId}
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
  <div class="column is-3-desktop">
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
      <div class="block">
        Currently working on {activePuzzles.length} puzzles
      </div>
      <div class="block">Done with {completedPuzzles().length} puzzles</div>
      <div class="block">
        <form on:submit|preventDefault={addPuzzleIdToWorkOn}>
          <label for="newPuzzleId">New Puzzle ID(s):</label>
          <input
            type="text"
            id="newPuzzleId"
            bind:value={newPuzzleIds}
            placeholder=""
          />
          <br />
          <button class="button is-primary" type="submit">Add</button>
        </form>
      </div>
    </div>
    {#if activePuzzles.length >= 1}
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
            {#each [...activePuzzles].sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}
              <tr
                animate:flip={{ duration: 400 }}
                class:is-selected={currentPuzzleId === puzzle.puzzleId}
              >
                <td class="puzzle-id">{puzzle.puzzleId}</td>
                <td>
                  {puzzle.averageSolveTime()
                    ? `${(puzzle.averageSolveTime() / 1000).toFixed(2)}s`
                    : "?"}
                </td>
                <td>
                  {puzzle.getTotalSolves()}
                </td>
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
