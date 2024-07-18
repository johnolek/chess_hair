<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Util } from "src/util";
  import { Chess } from "chess.js";
  import PuzzleHistoryProcessor from "./components/PuzzleHistoryProcessor.svelte";
  import CollapsibleBox from "./components/CollapsibleBox.svelte";
  import Spoiler from "./components/Spoiler.svelte";
  import NumberInput from "./components/forms/NumberInput.svelte";

  import {
    initSettings,
    updateSetting,
    getSetting,
  } from "./settingsManager.js";

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

  // Behavioral Config
  let minimumSolves = 2;

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
    const previous = currentPuzzle ? currentPuzzle.puzzle_id : null;
    const others = activePuzzles.filter(
      (puzzle) => puzzle.puzzle_id !== previous,
    );
    return Util.getRandomElement(others);
  }

  async function loadNextPuzzle() {
    puzzleComplete = false;
    madeMistake = false;

    if (puzzleWasCompleted) {
      puzzleWasCompleted = false;
      await updateActivePuzzles();
    }

    currentPuzzle = getNextPuzzle();
    const chessInstance = new Chess();
    lastMove = [
      currentPuzzle.last_move.substring(0, 2),
      currentPuzzle.last_move.substring(2, 4),
    ];
    chessInstance.load(currentPuzzle.fen);
    orientation = chessInstance.turn() === "w" ? "white" : "black";
    fen = currentPuzzle.fen;

    // Clone so we don't cache a value that gets shifted later
    moves = [...currentPuzzle.solution];

    updateNextMove();

    setTimeout(() => {
      puzzleShownAt = Util.currentMicrotime();
    }, 300);
  }

  function updateNextMove() {
    console.log(fen, moves[0]);
    const chessInstance = new Chess(fen);
    const correctMove = chessInstance.move(moves[0]);
    nextMove = correctMove.san;
  }

  async function handleUserMove(moveEvent) {
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    const correctMove = moves[0];
    if (move.lan === correctMove || isCheckmate) {
      moves.shift(); // remove the user move first
      const computerMove = moves.shift();
      if (computerMove) {
        moves = moves; // reactivity
        setTimeout(() => {
          chessboard.move(computerMove);
          updateNextMove();
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

  async function initializePuzzles() {
    await updateActivePuzzles();
    currentPuzzle = Util.getRandomElement(activePuzzles);
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
    activePuzzles = activePuzzles.map((puzzle) =>
      puzzle.puzzle_id === updatedPuzzle.puzzle_id ? updatedPuzzle : puzzle,
    );
  }

  let batchSize;
  let timeGoal;
  let minimumRating;
  let maximumRating;

  onMount(async () => {
    await initSettings();
    batchSize = getSetting("puzzles.batchSize");
    timeGoal = getSetting("puzzles.timeGoal");
    minimumRating = getSetting("puzzles.minRating");
    maximumRating = getSetting("puzzles.maxRating");
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
      {#if activePuzzles.length > 0 && currentPuzzle}
        <Chessboard
          bind:fen
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
              <div class="columns is-vcentered">
                <div class="column">
                  <span class="tag is-{orientation} is-size-4">
                    {orientation} to play
                  </span>
                </div>
                <div class="column">
                  <div>Rating</div>
                  <div>
                    <Spoiler isShown={puzzleComplete}>
                      <div>
                        {currentPuzzle.rating}
                      </div>
                    </Spoiler>
                  </div>
                </div>
                <div class="column">
                  {#if !puzzleComplete && nextMove}
                    <div>Next Move</div>
                    <div>
                      <Spoiler>
                        <div>
                          {nextMove}
                        </div>
                      </Spoiler>
                    </div>
                  {/if}
                </div>
                <div class="column">
                  <a
                    href="https://lichess.org/training/{currentPuzzle.puzzle_id}"
                    target="_blank"
                  >
                    {currentPuzzle.puzzle_id}
                  </a>
                </div>
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
        <p>Current Puzzle: <strong>{currentPuzzle.puzzle_id}</strong></p>

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
                class:is-selected={currentPuzzle.puzzle_id === puzzle.puzzle_id}
              >
                <td class="puzzle-id"
                  ><a
                    href={`https://lichess.org/training/${puzzle.puzzle_id}`}
                    target="_blank"
                    title="View on lichess.org">{puzzle.puzzle_id}</a
                  ></td
                >
                <td
                  class:has-text-warning={puzzle.average_solve_time > timeGoal}
                  class:has-text-success={puzzle.average_solve_time <=
                    timeGoal && puzzle.average_solve_time > 0}
                >
                  {puzzle.average_solve_time
                    ? `${puzzle.average_solve_time.toFixed(2)}s`
                    : "?"}
                </td>
                <td
                  class:has-text-warning={puzzle.streak < minimumSolves}
                  class:has-text-success={puzzle.streak >= minimumSolves}
                >
                  {puzzle.streak} / {minimumSolves}
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
        <p><strong>{totalIncorrectPuzzlesCount}</strong> total puzzles</p>
        {#if totalIncorrectPuzzlesCount !== totalFilteredPuzzlesCount}
          <p>
            <strong>{totalFilteredPuzzlesCount}</strong> puzzles after filtering
          </p>
        {/if}
        <p>
          <strong>{completedFilteredPuzzlesCount}</strong> puzzles completed
        </p>
        <p>
          Target solve time: <strong>{timeGoal}</strong> seconds
        </p>
        <p>
          Must solve <strong>{minimumSolves}</strong> time{minimumSolves > 1
            ? "s"
            : ""} in a row
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
