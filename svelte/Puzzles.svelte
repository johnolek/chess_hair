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
  import FocusTimer from "./components/FocusTimer.svelte";

  class Result {
    constructor(puzzleId, duration, madeMistake = false) {
      this.puzzleId = puzzleId;
      this.madeMistake = madeMistake;
      this.duration = duration;
    }
  }

  let loaded = false;

  // Chess board stuff
  let fen;
  /** @type {Chessboard} */
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
  let puzzleHistory = [];
  let currentPuzzle;
  let totalIncorrectPuzzlesCount;
  let totalFilteredPuzzlesCount;
  let completedFilteredPuzzlesCount;
  let randomCompletedPuzzle;
  let minimumPuzzlesBetweenReviews;
  let settingUpdating = false;

  let activePuzzleIds = [];
  $: {
    activePuzzleIds = activePuzzles.map((puzzle) => puzzle.puzzle_id);
  }

  let currentPuzzleId;
  $: {
    if (currentPuzzle) {
      currentPuzzleId = currentPuzzle.puzzle_id;
    }
  }

  let moves = [];
  $: {
    if (currentPuzzle) {
      moves = [];
      const chessInstance = new Chess();
      chessInstance.load(currentPuzzle.fen);
      currentPuzzle.moves.forEach((uciMove) => {
        const move = chessInstance.move(uciMove);
        moves.push(move);
      });
    }
  }

  // Current puzzle state
  let nextMove;
  let madeMistake = false;
  let puzzleComplete = false;
  let elapsedTime = 0;

  // History browsing
  let isViewingHistory = false;
  let moveIndex = 0;
  let maxMoveIndex = 0;
  let historyBackButton;
  let historyForwardButton;

  $: {
    if (loaded && chessboard) {
      if (isViewingHistory) {
        chessboard.enableViewOnly();
        chessboard.enableShowLastMove();
      } else {
        chessboard.disableViewOnly();
      }
    }
  }

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
      setTimeout(() => {
        void updateRandomCompletedPuzzle();
      }, 100);
      return randomCompletedPuzzle;
    }

    const lastSeen = puzzleHistory.slice(0, minimumPuzzlesBetweenReviews);

    const eligiblePuzzles = activePuzzles.filter(
      (puzzle) => !lastSeen.includes(puzzle.puzzle_id),
    );

    if (eligiblePuzzles.length >= 1) {
      return Util.getRandomElement(eligiblePuzzles);
    } else {
      if (
        randomCompletedPuzzle &&
        !lastSeen.includes(randomCompletedPuzzle.puzzle_id)
      ) {
        setTimeout(() => {
          void updateRandomCompletedPuzzle();
        }, 100);
        return randomCompletedPuzzle;
      }
    }

    return Util.getRandomElement(activePuzzles);
  }

  async function loadNextPuzzle() {
    if (!chessboard) {
      return;
    }
    chessboard.enableShowLastMove();
    puzzleComplete = false;
    madeMistake = false;
    isViewingHistory = false;

    currentPuzzle = getNextPuzzle();

    if (!currentPuzzle) {
      return;
    }

    puzzleHistory = [currentPuzzle.puzzle_id, ...puzzleHistory];
    moveIndex = 0;

    const chessInstance = new Chess();
    chessInstance.load(currentPuzzle.fen);
    // It gets loaded 1 move before th current move
    orientation = chessInstance.turn() === "w" ? "black" : "white";
    fen = currentPuzzle.fen;
    chessboard.load(fen);

    updateNextMove();

    setTimeout(() => {
      const computerMove = currentPuzzle.moves[0];
      chessboard.move(computerMove);
      moveIndex = 1;
      maxMoveIndex = 1;
      updateNextMove();
    }, 700);
  }

  function updateNextMove() {
    const chessInstance = new Chess(fen);
    const correctMove = chessInstance.move(currentPuzzle.moves[moveIndex]);
    nextMove = correctMove.san;
  }

  async function handleUserMove(moveEvent) {
    chessboard.disableShowLastMove();
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    if (move.san === nextMove || isCheckmate || puzzleComplete) {
      moveIndex = moveIndex + 1;
      maxMoveIndex = maxMoveIndex + 1;
      chessboard.highlightSquare(move.to, "correct-move", 700);
      const computerMove = currentPuzzle.moves[moveIndex];
      if (computerMove) {
        setTimeout(() => {
          moveIndex = moveIndex + 1;
          maxMoveIndex = maxMoveIndex + 1;
          chessboard.move(computerMove);
          chessboard.enableShowLastMove();
          updateNextMove();
        }, 300);
      } else {
        return await handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      chessboard.highlightSquare(move.to, "incorrect-move", 400);
      setTimeout(() => {
        chessboard.enableShowLastMove();
        chessboard.undo();
      }, 300);
    }
  }

  async function handlePuzzleComplete() {
    const result = new Result(
      currentPuzzle.puzzle_id,
      elapsedTime,
      madeMistake,
    );
    let message = madeMistake ? "Completed with mistake" : "Correct!";
    showSuccess(message);
    await savePuzzleResult(result);
    puzzleComplete = true;
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
    if (puzzleHistory.length === 0) {
      puzzleHistory = response.most_recent_seen;
    }
    totalIncorrectPuzzlesCount = response.total_incorrect_puzzles_count;
    totalFilteredPuzzlesCount = response.total_filtered_puzzles_count;
    completedFilteredPuzzlesCount = response.completed_filtered_puzzles_count;
  }

  async function updateRandomCompletedPuzzle() {
    const baseUrl = "/api/v1/users/random-completed-puzzle";
    const params = {};
    if (randomCompletedPuzzle) {
      params["exclude_puzzle_id"] = randomCompletedPuzzle.puzzle_id;
    }
    const queryString = new URLSearchParams(params).toString();
    const urlWithParams = `${baseUrl}?${queryString}`;
    const response = await Util.fetch(urlWithParams);
    if (response.ok) {
      randomCompletedPuzzle = await response.json();
    } else {
      randomCompletedPuzzle = null;
    }
  }

  let userInfo = {};
  async function initUserInfo() {
    const userInfoRequest = await Util.fetch("/api/v1/users/info");
    userInfo = await userInfoRequest.json();
  }

  async function initializePuzzles() {
    await updateActivePuzzles();
    if (!currentPuzzle) {
      currentPuzzle =
        Util.getRandomElement(activePuzzles) || randomCompletedPuzzle;
    }
  }

  async function savePuzzleResult(result) {
    const response = await Util.fetch("api/v1/puzzle_results", {
      method: "POST",
      body: JSON.stringify({
        puzzle_result: {
          puzzle_id: result.puzzleId,
          made_mistake: result.madeMistake,
          duration: result.duration,
        },
      }),
    });
    const data = await response.json();
    const updatedPuzzle = data.puzzle;
    const wasComplete = currentPuzzle.complete;
    currentPuzzle = updatedPuzzle;
    activePuzzles = activePuzzles.map((puzzle) =>
      puzzle.puzzle_id === updatedPuzzle.puzzle_id ? updatedPuzzle : puzzle,
    );

    if (
      randomCompletedPuzzle &&
      currentPuzzleId === randomCompletedPuzzle.puzzle_id
    ) {
      return;
    }

    if (currentPuzzle.complete || (wasComplete && !currentPuzzle.complete)) {
      await updateActivePuzzles();
    }
  }

  async function waitForImportComplete() {
    const userInfoInterval = setInterval(async () => {
      if (userInfo.import_in_progress) {
        await initUserInfo();
        await initializePuzzles();
      } else {
        clearInterval(userInfoInterval);
        await initializePuzzles();
      }
    }, 5000);
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
    if (userInfo.import_in_progress) {
      await waitForImportComplete();
    }
    batchSize = getSetting("puzzles.batchSize", 15);
    timeGoal = getSetting("puzzles.timeGoal", 20);
    minimumRating = getSetting("puzzles.minRating");
    maximumRating = getSetting("puzzles.maxRating");
    requiredConsecutiveSolves = getSetting("puzzles.consecutiveSolves", 2);
    oddsOfRandomCompleted = getSetting("puzzles.oddsOfRandomCompleted", 0.1);
    await updateRandomCompletedPuzzle();
    await initializePuzzles();
    minimumPuzzlesBetweenReviews = getSetting(
      "puzzles.minimumPuzzlesBetweenReviews",
      Math.max(activePuzzles.length - 3, 0),
    );
    document.addEventListener("keydown", function (event) {
      if (["Enter", " "].includes(event.key) && nextButton) {
        event.preventDefault();
        nextButton.click();
      }
      if (event.key === "ArrowRight" && historyForwardButton) {
        event.preventDefault();
        historyForwardButton.click();
      }
      if (event.key === "ArrowLeft" && historyBackButton) {
        event.preventDefault();
        historyBackButton.click();
      }
    });
    loaded = true;
    await loadNextPuzzle();
    setTimeout(async () => {
      // Fix to make sure the board updates on initial load
      await loadNextPuzzle();
    }, 1);
  });
</script>

{#if loaded}
  <div class="columns is-centered">
    <div class="column is-6">
      <div class="block">
        {#if currentPuzzle}
          <div class="block">
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

          <div class="block">
            <div class="board-container">
              {#key currentPuzzle.puzzle_id}
                <FocusTimer bind:elapsedTime />
              {/key}
              <Chessboard
                bind:fen
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
              </Chessboard>
            </div>
          </div>

          <div class="block">
            <div class="columns has-text-centered">
              <div class="column">
                <button
                  disabled={moveIndex === 0}
                  class="button is-primary is-large history-button"
                  bind:this={historyBackButton}
                  on:click={() => {
                    isViewingHistory = true;
                    moveIndex -= 1;
                    chessboard.undo();
                  }}>&#x276E;</button
                >
                <button
                  disabled={moveIndex === maxMoveIndex}
                  class="button is-primary is-large history-button"
                  bind:this={historyForwardButton}
                  on:click={() => {
                    chessboard.move(currentPuzzle.moves[moveIndex]);
                    moveIndex += 1;
                    if (moveIndex === maxMoveIndex) {
                      isViewingHistory = false;
                    }
                  }}>&#x276F;</button
                >
              </div>
            </div>
          </div>
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
          <p>There are no current puzzles to play.</p>
        {/if}
      </div>
    </div>
    <div class="column is-4">
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
                  class:is-selected={currentPuzzle.puzzle_id ===
                    puzzle.puzzle_id}
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
          {:else if userInfo && userInfo.import_in_progress}
            <div class="block">
              <p>
                Puzzle import in progress. This can take a long time, especially
                the first time.
              </p>
              <progress class="progress is-small is-primary" max="100"
              ></progress>
            </div>
          {:else}
            <button
              on:click={async () => {
                await Util.fetch("/api/v1/users/import-new-puzzle-histories", {
                  method: "POST",
                });
                userInfo = { ...userInfo, import_in_progress: true };
                await waitForImportComplete();
              }}
              class="button is-primary"
              >Fetch latest puzzles from lichess</button
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
        </div>
      </div>
      <CollapsibleBox title="Config" defaultOpen={true}>
        <NumberInput
          label="Batch Size"
          helpText="How many puzzles you want to focus on at a time."
          min={5}
          max={50}
          step={1}
          isLoading={settingUpdating}
          bind:value={batchSize}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.batchSize", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        <NumberInput
          label="Minimum Puzzles Between Reviews"
          helpText="The number of other puzzles you will see before repeating a puzzle. Can't be more than the total number of active puzzles + completed puzzles."
          min={0}
          max={activePuzzles.length + completedFilteredPuzzlesCount - 1}
          step={1}
          isLoading={settingUpdating}
          bind:value={minimumPuzzlesBetweenReviews}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.minimumPuzzlesBetweenReviews", value);
            settingUpdating = false;
          }}
        />
        <NumberInput
          label="Odds of Random Completed Puzzle"
          helpText="A number between 0 and 1 representing the odds of getting a random completed puzzle instead of one from the current batch. 1 = always random, 0 = never random, .25 = 25% chance."
          min={0}
          max={1}
          step={0.01}
          isLoading={settingUpdating}
          bind:value={oddsOfRandomCompleted}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.oddsOfRandomCompleted", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        <hr />
        <NumberInput
          label="Required Consecutive Solves"
          helpText="How many times you need to solve a puzzle correctly in a row to consider it completed."
          min={1}
          max={10}
          step={1}
          isLoading={settingUpdating}
          bind:value={requiredConsecutiveSolves}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.consecutiveSolves", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        <NumberInput
          label="Time Goal"
          helpText={`The target time to solve a puzzle in seconds. A puzzle will be considered completed if the average of the last ${requiredConsecutiveSolves} solves is less than this time.`}
          min={10}
          max={1000}
          step={1}
          isLoading={settingUpdating}
          bind:value={timeGoal}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.timeGoal", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        <hr />
        <NumberInput
          label="Minimum Rating"
          helpText="Only include Lichess puzzles with a rating of at least this amount."
          min={1}
          max={3500}
          step={1}
          isLoading={settingUpdating}
          bind:value={minimumRating}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.minRating", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        <NumberInput
          label="Maximum Rating"
          helpText="Only include Lichess puzzles with a rating less than this amount."
          min={1}
          max={3500}
          step={1}
          isLoading={settingUpdating}
          bind:value={maximumRating}
          onChange={async (value) => {
            settingUpdating = true;
            await updateSetting("puzzles.maxRating", value);
            await updateActivePuzzles();
            settingUpdating = false;
          }}
        />
        {#if settingUpdating}
          <h2>Updating...</h2>
          <progress class="progress is-small is-primary" max="100" />
        {/if}
      </CollapsibleBox>
    </div>
  </div>
{:else}
  <div class="container">
    <div class="block has-text-centered">
      <h2>Loading</h2>
      <progress class="progress is-small is-primary" max="100" />
    </div>
  </div>
{/if}

<style>
  .puzzle-id {
    font-family: monospace;
  }
  .board-container {
    max-width: 80vh;
  }
  .history-button {
    touch-action: manipulation;
  }
</style>
