<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Util } from "src/util";
  import { persisted } from "svelte-persisted-store";
  import { Chess } from "chess.js";
  import PuzzleHistoryProcessor from "./components/PuzzleHistoryProcessor.svelte";
  import CollapsibleBox from "./components/CollapsibleBox.svelte";
  import Spoiler from "./components/Spoiler.svelte";
  import NumberInput from "./components/forms/NumberInput.svelte";
  import { writable } from "svelte/store";

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

    wasFailure() {
      return this.madeMistake;
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

    getFailureCount() {
      return this.getResults().filter((result) => result.wasFailure()).length;
    }

    getSolveStreak() {
      let streak = 0;

      if (!this.hasBeenSolved()) {
        return streak;
      }

      const results = this.getResults();

      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i].wasSuccessful()) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
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
      const average = sum / (lastFew.length || 1) / 1000;
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

      return this.averageSolveTime() <= $timeGoal;
    }
  }

  // Chess board stuff
  let fen;
  let lastMove;
  let chessboard;
  let orientation = "white";
  let chessgroundConfig = {
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
    },
    orientation: orientation,
  };

  // Puzzle Data
  let allPuzzles = [];
  let activePuzzles = [];

  $: {
    if (activePuzzles.length < $batchSize && allPuzzles.length > 0) {
      fillActivePuzzles();
    }
  }

  let completedPuzzles = [];
  let currentPuzzle;
  let puzzleShownAt;

  // Behavioral Config
  let minimumSolves = 2;
  let alreadyCompleteOdds = 0.3;

  // Current puzzle state
  let moves;
  let madeMistake = false;
  let puzzleComplete = false;

  // DOM elements
  let nextButton;

  // Persisted data
  const puzzleDataStore = persisted("puzzles.data", {});
  const puzzleIdsToWorkOn = writable([]);
  const results = writable({});

  // Persisted config
  const batchSize = persisted("puzzles.batchSize", 10);
  const timeGoal = persisted("puzzles.timeGoal", 15);

  function fillActivePuzzles() {
    const completed = Util.sortRandomly(getCompletedPuzzles());
    const incompleteInactive = Util.sortRandomly(getInactiveCompletedPuzzles());
    let puzzleType;
    while (allPuzzles.length > 0 && activePuzzles.length < $batchSize) {
      puzzleType = Math.random() < 0.2 ? "completed" : "inactive";
      if (incompleteInactive.length < 1 && completed.length < 1) {
        break;
      }
      if (puzzleType === "completed" && completed.length > 0) {
        addActivePuzzle(completed.pop());
      } else if (incompleteInactive.length > 0) {
        addActivePuzzle(incompleteInactive.pop());
      }
    }
  }

  // This is tied to the add new puzzle form
  let newPuzzleIds;

  function addPuzzleIdToWorkOn() {
    if (newPuzzleIds.length < 3) {
      newPuzzleIds = "";
      return;
    }
    const idsToAdd = newPuzzleIds.split(",").map((id) => id.trim());
    const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
    idsToAdd.forEach(async (id) => {
      currentPuzzleIds.add(id);
      await saveUserPuzzle(id);
    });
    puzzleIdsToWorkOn.set([...currentPuzzleIds]);
    newPuzzleIds = "";
  }

  function removePuzzleId(puzzleId) {
    const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
    currentPuzzleIds.delete(puzzleId.trim());
    puzzleIdsToWorkOn.set([...currentPuzzleIds]);
  }

  function addActivePuzzle(puzzle) {
    activePuzzles = [
      ...new Set([
        ...activePuzzles.map((puzzle) => puzzle.puzzleId),
        puzzle.puzzleId,
      ]),
    ].map((puzzleId) => new Puzzle(puzzleId));
  }

  function removeActivePuzzle(puzzle) {
    activePuzzles = activePuzzles.filter(
      (activePuzzle) => activePuzzle.puzzleId !== puzzle.puzzleId,
    );
  }

  function getCompletedPuzzles() {
    return allPuzzles.filter((puzzle) => puzzle.isComplete());
  }

  function getIncompletePuzzles() {
    return allPuzzles.filter((puzzle) => !puzzle.isComplete());
  }

  function getInactiveCompletedPuzzles() {
    return getIncompletePuzzles().filter(
      (puzzle) => !activePuzzles.includes(puzzle),
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
    const previous = currentPuzzle ? currentPuzzle.puzzleId : null;

    const type = getNextPuzzleType();

    const alreadyComplete = activePuzzles.filter((puzzle) =>
      puzzle.isComplete(),
    );

    const incomplete = activePuzzles.filter((puzzle) => !puzzle.isComplete());

    let candidatePuzzle;
    if (
      (type === "alreadyComplete" && alreadyComplete.length > 0) ||
      incomplete.length < 1
    ) {
      candidatePuzzle = Util.getRandomElement(activePuzzles);
    } else {
      candidatePuzzle = Util.getRandomElement(incomplete);
    }

    if (activePuzzles.length > 1 && candidatePuzzle.puzzleId === previous) {
      return getNextPuzzle();
    }

    currentPuzzle = allPuzzles.find(
      (puzzle) => puzzle.puzzleId === candidatePuzzle.puzzleId,
    );

    const data = await getPuzzleData(currentPuzzle.puzzleId);

    if (data === null) {
      return getNextPuzzle();
    }

    return data;
  }

  async function getPuzzleData(puzzleId) {
    // Check cache first
    if ($puzzleDataStore[puzzleId]) {
      return $puzzleDataStore[puzzleId];
    }

    const response = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      // Remove invalid
      removePuzzleId(puzzleId);
      return null;
    }

    const puzzleData = await response.json();
    const data = $puzzleDataStore;
    data[puzzleId] = puzzleData;
    puzzleDataStore.set(data);
    return puzzleData;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getNextPuzzleType() {
    const randomValue = Math.random();
    if (randomValue < alreadyCompleteOdds) {
      return "alreadyComplete";
    }
    return "incomplete";
  }

  async function skip() {
    const result = new Result(currentPuzzle.puzzleId, puzzleShownAt, true);
    await addResult(currentPuzzle.puzzleId, result);
    await loadNextPuzzle();
  }

  async function addResult(puzzleId, result) {
    const allResults = $results;
    const existingResults = $results[puzzleId] || [];
    existingResults.push(result);
    allResults[puzzleId] = existingResults;
    results.set(allResults);
    await savePuzzleResult(result);
  }

  function addCompletedPuzzle(puzzleToAdd) {
    completedPuzzles = [
      ...new Set([
        ...getCompletedPuzzles().map((puzzle) => puzzle.puzzleId),
        puzzleToAdd.puzzleId,
      ]),
    ].map((puzzleId) => new Puzzle(puzzleId));
  }

  function removeCompletedPuzzle(puzzleToRemove) {
    completedPuzzles = completedPuzzles.filter(
      (puzzle) => puzzle.puzzleId !== puzzleToRemove.puzzleId,
    );
  }

  async function loadNextPuzzle() {
    puzzleComplete = false;
    madeMistake = false;

    if (allPuzzles.length < 1) {
      return;
    }

    if (currentPuzzle && currentPuzzle.isComplete()) {
      removeActivePuzzle(currentPuzzle);
      addCompletedPuzzle(currentPuzzle);
    }

    const next = await getNextPuzzle();
    orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1);
    // Clone so we don't cache a value that gets shifted later
    moves = [...next.puzzle.solution];

    const chessInstance = new Chess();
    chessInstance.loadPgn(next.game.pgn);
    const history = chessInstance.history({ verbose: true });
    lastMove = history[history.length - 1];
    fen = chessInstance.fen();

    setTimeout(() => {
      puzzleShownAt = Util.currentMicrotime();
    }, 300);
  }

  async function handleUserMove(moveEvent) {
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    const correctMove = moves[0];
    if (move.lan === correctMove || isCheckmate) {
      moves.shift(); // remove the user move first
      const computerMove = moves.shift();
      if (computerMove) {
        setTimeout(() => {
          chessboard.move(computerMove);
        }, 300);
      } else {
        return await handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      showFailure("Nope!");
      setTimeout(() => {
        chessboard.undo();
      }, 300);
    }
  }

  async function handlePuzzleComplete() {
    puzzleComplete = true;
    const result = new Result(
      currentPuzzle.puzzleId,
      puzzleShownAt,
      false,
      madeMistake,
      Util.currentMicrotime(),
    );
    await addResult(currentPuzzle.puzzleId, result);
    if (madeMistake) {
      removeCompletedPuzzle(currentPuzzle);
    }
    // Trigger reactivity
    activePuzzles = activePuzzles;
    showSuccess("Correct!");
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

  async function initializePuzzles() {
    allPuzzles = [];
    const userPuzzles = await Util.fetch("/api/v1/user_puzzles", {
      method: "GET",
    });
    const resultsResponse = await Util.fetch("/api/v1/puzzle_results", {
      method: "GET",
    });
    const resultsJson = await resultsResponse.json();
    const initialResults = {};
    resultsJson.forEach((result) => {
      if (!initialResults[result.puzzle_id]) {
        initialResults[result.puzzle_id] = [];
      }
      initialResults[result.puzzle_id].push({
        puzzleId: result.puzzle_id,
        seenAt: result.seen_at,
        doneAt: result.done_at,
        skipped: result.skipped,
        madeMistake: result.made_mistake,
      });
    });
    results.set(initialResults);

    const responseJson = await userPuzzles.json();
    const promises = responseJson.map(async (puzzleData, index) => {
      const lichessPuzzlesData = await getPuzzleData(puzzleData.puzzle_id);
      return lichessPuzzlesData.puzzle.rating <= 1800 ? puzzleData : null;
    });
    const promiseResults = await Promise.all(promises);
    const puzzles = promiseResults.filter((result) => result !== null);
    const puzzleIds = puzzles.map((puzzleData) => puzzleData.puzzle_id);
    puzzleIdsToWorkOn.set(puzzleIds);
    $puzzleIdsToWorkOn.forEach((puzzleId) => {
      allPuzzles.push(new Puzzle(puzzleId));
    });
    completedPuzzles = getCompletedPuzzles();
    fillActivePuzzles();
  }

  async function saveUserPuzzle(puzzleId) {
    await Util.fetch("api/v1/user_puzzles", {
      method: "POST",
      body: JSON.stringify({
        user_puzzle: {
          puzzle_id: puzzleId,
        },
      }),
    });
  }

  async function savePuzzleResult(result) {
    await Util.fetch("api/v1/puzzle_results", {
      method: "POST",
      body: JSON.stringify({
        puzzle_result: {
          puzzle_id: result.puzzleId,
          seen_at: result.seenAt,
          skipped: result.skipped,
          made_mistake: result.madeMistake,
          done_at: result.doneAt,
        },
      }),
    });
  }

  let csrfToken;
  onMount(async () => {
    await initializePuzzles();
    csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
    document.addEventListener("keydown", function (event) {
      if (["Enter", " "].includes(event.key) && nextButton) {
        event.preventDefault();
        nextButton.click();
      }
    });
    await loadNextPuzzle();
  });
</script>

<div class="columns is-centered">
  <div class="column is-6-desktop">
    <div class="block">
      {#if activePuzzles.length > 0 && currentPuzzle}
        <Chessboard
          {fen}
          {lastMove}
          {chessgroundConfig}
          {orientation}
          bind:this={chessboard}
          on:move={handleUserMove}
        >
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
  <div class="column is-4-desktop">
    {#if activePuzzles.length >= 1 && currentPuzzle}
      <div class="box">
        <h3>Current Puzzles</h3>
        <p>Current Puzzle: <strong>{currentPuzzle.puzzleId}</strong></p>
        {#await getPuzzleData(currentPuzzle.puzzleId) then data}
          <p>
            Rating: <Spoiler isShown={puzzleComplete}
              >{data.puzzle.rating}</Spoiler
            >
          </p>
        {/await}
        {#if !puzzleComplete && moves && moves.length >= 1}
          <p>Next move: <Spoiler>{moves[0]}</Spoiler></p>
        {/if}
        <table class="table is-fullwidth is-narrow is-striped">
          <thead>
            <tr>
              <th><abbr title="Lichess Puzzle ID">ID</abbr></th>
              <th><abbr title="Average solve time">Avg</abbr></th>
              <th><abbr title="Correct solves in a row">Streak</abbr></th>
              <th><abbr title="Total correct solves">Solves</abbr></th>
              <th><abbr title="Failure Count">Fails</abbr></th>
            </tr>
          </thead>
          <tbody>
            {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}
              <tr
                animate:flip={{ duration: 400 }}
                class:is-selected={currentPuzzle.puzzleId === puzzle.puzzleId}
              >
                <td class="puzzle-id"
                  ><a
                    href={puzzle.lichessUrl()}
                    target="_blank"
                    title="View on lichess.org">{puzzle.puzzleId}</a
                  ></td
                >
                <td
                  class:has-text-warning={puzzle.averageSolveTime() > $timeGoal}
                  class:has-text-success={puzzle.averageSolveTime() <=
                    $timeGoal && puzzle.averageSolveTime() > 0}
                >
                  {puzzle.averageSolveTime()
                    ? `${puzzle.averageSolveTime().toFixed(2)}s`
                    : "?"}
                </td>
                <td
                  class:has-text-warning={puzzle.getSolveStreak() <
                    minimumSolves}
                  class:has-text-success={puzzle.getSolveStreak() >=
                    minimumSolves}
                >
                  {puzzle.getSolveStreak()} / {minimumSolves}
                </td>
                <td>
                  {puzzle.getTotalSolves()}
                </td>
                <td>
                  {puzzle.getFailureCount()}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <div class="box">
      <div class="block">
        <p><strong>{$puzzleIdsToWorkOn.length}</strong> total puzzles</p>
        <p>Done with <strong>{completedPuzzles.length}</strong> puzzles</p>
        <p>
          Target solve time: <strong>{$timeGoal}</strong> seconds
        </p>
        <p>
          Must solve <strong>{minimumSolves}</strong> time{minimumSolves > 1
            ? "s"
            : ""} in a row
        </p>
      </div>
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
    <CollapsibleBox title="Config" defaultOpen={true}>
      <NumberInput
        label="Batch Size"
        showSlider={true}
        min={5}
        max={50}
        step={1}
        bind:value={$batchSize}
      />
      <NumberInput
        label="Time Goal"
        showSlider={true}
        min={10}
        max={60}
        step={1}
        bind:value={$timeGoal}
      />
    </CollapsibleBox>
    <CollapsibleBox title="Puzzle History Helper">
      <PuzzleHistoryProcessor />
    </CollapsibleBox>
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }
</style>
