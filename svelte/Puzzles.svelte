<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Util } from "src/util";
  import { Chess } from "chess.js";
  import CollapsibleBox from "./components/CollapsibleBox.svelte";
  import Spoiler from "./components/Spoiler.svelte";
  import NumberInput from "./components/forms/NumberInput.svelte";

  import {
    initSettings,
    updateSetting,
    getSetting,
  } from "./settingsManager.js";
  import ProgressBar from "./components/ProgressBar.svelte";

  class Result {
    constructor(puzzleId, seenAt, madeMistake = false, doneAt = null) {
      this.puzzleId = puzzleId;
      this.madeMistake = madeMistake;
      this.seenAt = seenAt;
      this.doneAt = doneAt;
    }
  }

  // Chess board stuff
  let fen;
  let lastMove;
  let chessboard;
  let chessground;
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
  let activePuzzles = [];
  let currentPuzzle;
  let puzzleShownAt;
  let totalIncorrectPuzzlesCount;
  let totalFilteredPuzzlesCount;
  let completedFilteredPuzzlesCount;
  let randomCompletedPuzzle;

  // Behavioral Config

  // Current puzzle state
  let moves;
  let nextMove;
  let madeMistake = false;
  let puzzleComplete = false;

  // DOM elements
  let nextButton;

  $: {
    if (!currentPuzzle && activePuzzles && activePuzzles.length > 0) {
      loadNextPuzzle();
    }
  }

  function sortPuzzlesBySolveTime(a, b) {
    const aTime = a.average_solve_time;
    const bTime = b.average_solve_time;

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

  function getNextPuzzle() {
    if (
      randomCompletedPuzzle &&
      (Math.random() < oddsOfRandomCompleted || activePuzzles.length < 1)
    ) {
      fetchRandomCompletePuzzle();
      return randomCompletedPuzzle;
    }
    const previous = currentPuzzle ? currentPuzzle.puzzle_id : null;
    const others = activePuzzles.filter(
      (puzzle) => puzzle.puzzle_id !== previous,
    );
    if (others.length === 0) {
      return currentPuzzle;
    }
    return Util.getRandomElement(others);
  }

  async function loadNextPuzzle() {
    if (!chessboard) {
      return;
    }
    puzzleComplete = false;
    madeMistake = false;

    if (puzzleWasCompleted) {
      puzzleWasCompleted = false;
      await updateActivePuzzles();
    }

    currentPuzzle = getNextPuzzle();
    if (!currentPuzzle) {
      return;
    }
    const chessInstance = new Chess();
    lastMove = [
      currentPuzzle.last_move.substring(0, 2),
      currentPuzzle.last_move.substring(2, 4),
    ];
    chessInstance.load(currentPuzzle.fen);
    orientation = chessInstance.turn() === "w" ? "white" : "black";
    fen = currentPuzzle.fen;
    chessboard.load(fen);
    chessboard.setLastMove(lastMove);

    // Clone so we don't cache a value that gets shifted later
    moves = [...currentPuzzle.solution];

    updateNextMove();

    setTimeout(() => {
      puzzleShownAt = Util.currentMicrotime();
    }, 300);
  }

  function updateNextMove() {
    const chessInstance = new Chess(fen);
    const correctMove = chessInstance.move(moves[0]);
    nextMove = correctMove.san;
  }

  async function handleUserMove(moveEvent) {
    chessground.set({ highlight: { lastMove: false } });
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    const correctMove = moves[0];
    if (move.lan === correctMove || isCheckmate) {
      chessboard.highlightSquare(move.to, "correct-move", 1000);
      moves.shift(); // remove the user move first
      const computerMove = moves.shift();
      if (computerMove) {
        moves = moves; // reactivity
        setTimeout(() => {
          chessboard.move(computerMove);
          chessground.set({ highlight: { lastMove: true } });
          updateNextMove();
        }, 300);
      } else {
        return await handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      chessboard.highlightSquare(move.to, "incorrect-move", 300);
      setTimeout(() => {
        chessboard.undo();
      }, 300);
    }
  }

  async function handlePuzzleComplete() {
    puzzleComplete = true;
    const result = new Result(
      currentPuzzle.puzzle_id,
      puzzleShownAt,
      madeMistake,
      Util.currentMicrotime(),
    );
    let message = madeMistake ? "Completed with mistake" : "Correct!";
    showSuccess(message);
    await savePuzzleResult(result);

    // Trigger reactivity
    activePuzzles = activePuzzles;
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

  async function updateActivePuzzles() {
    const activePuzzlesRequest = await Util.fetch(
      "/api/v1/users/active-puzzles",
    );
    const response = await activePuzzlesRequest.json();
    activePuzzles = response.puzzles;
    totalIncorrectPuzzlesCount = response.total_incorrect_puzzles_count;
    totalFilteredPuzzlesCount = response.total_filtered_puzzles_count;
    completedFilteredPuzzlesCount = response.completed_filtered_puzzles_count;
  }

  async function fetchRandomCompletePuzzle() {
    const request = await Util.fetch("/api/v1/users/random-completed-puzzle");
    if (request.ok) {
      randomCompletedPuzzle = await request.json();
    }
  }

  let userInfo;
  async function initUserInfo() {
    const userInfoRequest = await Util.fetch("/api/v1/users/info");
    userInfo = await userInfoRequest.json();
  }

  async function initializePuzzles() {
    await updateActivePuzzles();
    await fetchRandomCompletePuzzle();
    currentPuzzle =
      Util.getRandomElement(activePuzzles) || randomCompletedPuzzle;
  }

  let puzzleWasCompleted = false;

  async function savePuzzleResult(result) {
    const response = await Util.fetch("api/v1/puzzle_results", {
      method: "POST",
      body: JSON.stringify({
        puzzle_result: {
          puzzle_id: result.puzzleId,
          seen_at: result.seenAt,
          made_mistake: result.madeMistake,
          done_at: result.doneAt,
        },
      }),
    });
    const data = await response.json();
    const updatedPuzzle = data.puzzle;
    puzzleWasCompleted = updatedPuzzle.complete;
    currentPuzzle = updatedPuzzle;
    activePuzzles = activePuzzles.map((puzzle) =>
      puzzle.puzzle_id === updatedPuzzle.puzzle_id ? updatedPuzzle : puzzle,
    );
  }

  let batchSize;
  let requiredConsecutiveSolves;
  let timeGoal;
  let minimumRating;
  let maximumRating;
  let oddsOfRandomCompleted;

  onMount(async () => {
    await initSettings();
    await initUserInfo();
    batchSize = getSetting("puzzles.batchSize", 15);
    timeGoal = getSetting("puzzles.timeGoal", 20);
    minimumRating = getSetting("puzzles.minRating");
    maximumRating = getSetting("puzzles.maxRating");
    requiredConsecutiveSolves = getSetting("puzzles.consecutiveSolves", 2);
    oddsOfRandomCompleted = getSetting("puzzles.oddsOfRandomCompleted", 0.1);
    await initializePuzzles();
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
      {#if currentPuzzle}
        <Chessboard
          bind:fen
          {chessgroundConfig}
          bind:chessground
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
        </Chessboard>
        {#if currentPuzzle}
          <div class="block mt-2">
            <div class="columns is-mobile">
              <div class="column">
                <a
                  href={`https://lichess.org/training/${currentPuzzle.puzzle_id}`}
                  class="puzzle-id"
                  target="_blank"
                  title="View on lichess.org">{currentPuzzle.puzzle_id}</a
                >
              </div>
              <div class="column">
                {#if currentPuzzle.average_solve_time}
                  <span
                    class:has-text-warning={currentPuzzle.average_solve_time >
                      timeGoal}
                    class:has-text-success={currentPuzzle.average_solve_time <=
                      timeGoal && currentPuzzle.average_solve_time > 0}
                    >{currentPuzzle.average_solve_time.toFixed(2)}s</span
                  >
                {/if}
              </div>
              <div class="column is-two-thirds">
                {#key currentPuzzle.puzzle_id}
                  <ProgressBar
                    max={requiredConsecutiveSolves}
                    bind:current={currentPuzzle.streak}
                    className={currentPuzzle.streak >= requiredConsecutiveSolves
                      ? "is-success"
                      : "is-warning"}
                  ></ProgressBar>
                {/key}
              </div>
            </div>
          </div>
        {/if}
        <div>
          <div class="columns is-vcentered is-mobile">
            {#if puzzleComplete}
              <div class="column">
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
              <div class="column">
                <span class="tag is-{orientation} is-size-4">
                  {orientation} to play
                </span>
              </div>
              <div class="column">
                {#if nextMove}
                  <div>Next Move</div>
                  <div>
                    <Spoiler minWidth="70">
                      <div>
                        {nextMove}
                      </div>
                    </Spoiler>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="column">
              <div>Rating</div>
              <div>
                {#key currentPuzzle.puzzle_id}
                  <Spoiler minWidth="70" isShown={puzzleComplete}>
                    <div>
                      {currentPuzzle.rating}
                    </div>
                  </Spoiler>
                {/key}
              </div>
            </div>
          </div>
        </div>
      {:else}
        <p>All puzzles complete, add some more!</p>
      {/if}
    </div>
  </div>
  <div class="column is-4-desktop">
    {#if activePuzzles.length >= 1 && currentPuzzle}
      <div class="box">
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
            {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle.puzzle_id)}
              <tr
                animate:flip={{ duration: 400 }}
                class:is-selected={currentPuzzle.puzzle_id === puzzle.puzzle_id}
              >
                <td class="puzzle-id"
                  ><a
                    href={`https://lichess.org/training/${puzzle.puzzle_id}`}
                    target="_blank"
                    title="View on lichess.org">{puzzle.puzzle_id}</a
                  ></td
                >
                {#if puzzle.average_solve_time}
                  <td
                    class:has-text-warning={puzzle.average_solve_time >
                      timeGoal}
                    class:has-text-success={puzzle.average_solve_time <=
                      timeGoal && puzzle.average_solve_time > 0}
                  >
                    {puzzle.average_solve_time.toFixed(2)}s
                  </td>
                {:else}
                  <td>?</td>
                {/if}
                <td>
                  <ProgressBar
                    max={requiredConsecutiveSolves}
                    bind:current={puzzle.streak}
                    className={puzzle.streak >= requiredConsecutiveSolves
                      ? "is-success"
                      : "is-warning"}
                  ></ProgressBar>
                </td>
                <td>
                  {puzzle.total_solves}
                </td>
                <td>
                  {puzzle.total_fails}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <div class="box">
      <div class="block">
        {#if userInfo && !userInfo.has_lichess_token}
          <a href="/authenticate-with-lichess" class="button is-primary">
            Authenticate with Lichess to load puzzles
          </a>
        {:else}
          <a href="/fetch-puzzle-history" class="button is-primary"
            >Fetch latest puzzles from lichess</a
          >
        {/if}
        <p><strong>{totalIncorrectPuzzlesCount}</strong> total puzzles</p>
        {#if totalIncorrectPuzzlesCount !== totalFilteredPuzzlesCount}
          <p>
            <strong>{totalFilteredPuzzlesCount}</strong> puzzles after filtering
          </p>
        {/if}
        {#if totalFilteredPuzzlesCount && completedFilteredPuzzlesCount}
          <p>
            <strong>{completedFilteredPuzzlesCount}</strong> of
            <strong>{totalFilteredPuzzlesCount}</strong> completed
          </p>
          <ProgressBar
            max={totalFilteredPuzzlesCount}
            bind:current={completedFilteredPuzzlesCount}
          />
        {/if}
        <p>
          Target solve time: <strong>{timeGoal}</strong> seconds
        </p>
        <p>
          Must solve <strong>{requiredConsecutiveSolves}</strong>
          time{requiredConsecutiveSolves > 1 ? "s" : ""} in a row
        </p>
      </div>
    </div>
    <CollapsibleBox title="Config" defaultOpen={true}>
      <NumberInput
        label="Batch Size"
        min={5}
        max={50}
        step={1}
        bind:value={batchSize}
        onChange={async (value) => {
          await updateSetting("puzzles.batchSize", value);
          await updateActivePuzzles();
        }}
      />
      <NumberInput
        label="Time Goal"
        min={10}
        max={60}
        step={1}
        bind:value={timeGoal}
        onChange={async (value) => {
          await updateSetting("puzzles.timeGoal", value);
          await updateActivePuzzles();
        }}
      />
      <NumberInput
        label="Required Consecutive Solves"
        min={1}
        max={10}
        step={1}
        bind:value={requiredConsecutiveSolves}
        onChange={async (value) => {
          await updateSetting("puzzles.consecutiveSolves", value);
          await updateActivePuzzles();
        }}
      />
      <NumberInput
        label="Minimum Rating"
        min={1}
        max={3500}
        step={1}
        bind:value={minimumRating}
        onChange={async (value) => {
          await updateSetting("puzzles.minRating", value);
          await updateActivePuzzles();
        }}
      />
      <NumberInput
        label="Maximum Rating"
        min={1}
        max={3500}
        step={1}
        bind:value={maximumRating}
        onChange={async (value) => {
          await updateSetting("puzzles.maxRating", value);
          await updateActivePuzzles();
        }}
      />
      <NumberInput
        label="Odds of Random Completed Puzzle"
        min={0}
        max={1}
        step={0.01}
        bind:value={oddsOfRandomCompleted}
        onChange={async (value) => {
          await updateSetting("puzzles.oddsOfRandomCompleted", value);
          await updateActivePuzzles();
        }}
      />
    </CollapsibleBox>
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }
</style>
