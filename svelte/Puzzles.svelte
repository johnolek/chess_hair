<script>
  import Chessboard from "./components/Chessboard.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import FocusTimer from "./components/FocusTimer.svelte";
  import PuzzleManager from "./PuzzleManager.svelte";
  import ResultTimeline from "./components/ResultTimeline.svelte";
  import { Chess } from "chess.js";
  import { Util } from "src/util";
  import { onMount } from "svelte";
  import { fade, crossfade, fly } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { scrollIntoView } from "./actions/scrollIntoView";
  import CollapsibleBox from "./components/CollapsibleBox.svelte";
  import Spoiler from "./components/Spoiler.svelte";
  import { getSetting, initSettings } from "./settingsManager.js";
  import * as RailsAPI from "./railsApi";

  // State stores
  import {
    activePuzzles,
    currentPuzzle,
    totalIncorrectPuzzlesCount,
    totalFilteredPuzzlesCount,
    completedFilteredPuzzlesCount,
    stockfishLines,
    stockfishCores,
    stockfishDepth,
    puzzleMode,
  } from "./stores.js";

  const [send, receive] = crossfade({ fallback: fade, duration: 300 });

  import PuzzleConfigForm from "./PuzzleConfigForm.svelte";
  import DevOnly from "./components/DevOnly.svelte";
  import MaterialCounter from "./components/MaterialCounter.svelte";
  import DrillModePuzzleManager from "./DrillModePuzzleManager.svelte";
  import DrillModeConfigForm from "./DrillModeConfigForm.svelte";
  import DrillModeLevelsTable from "./components/DrillModeLevelsTable.svelte";
  import PuzzleBuilder from "./components/PuzzleBuilder.svelte";

  /** @type {PuzzleManager|DrillModePuzzleManager} */
  let puzzleManager;
  let loaded = false;
  let fen;

  let moveTree;
  // When we're going to undo a move we don't want the highlight to flash
  let fenToHighlight;

  // Chess board stuff
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

  let moves = [];

  let madeMistake = false;
  let mistakes = new Map();
  $: mistakeMoves = Array.from(mistakes.values());
  let puzzleComplete = false;
  let elapsedTime = 0;

  function resetPuzzleState() {
    madeMistake = false;
    mistakes = new Map();
    puzzleComplete = false;
    elapsedTime = 0;
    lastMoveIndexToShow = 0;

    if (chessboard) {
      chessboard.enableShowLastMove();
    }
  }

  // Stockfish
  let topStockfishMoves = [];

  // History browsing
  let hasHistoryForward;
  let hasHistoryBack;
  let lastMoveIndexToShow = 0;
  let isViewingHistory;

  // DOM elements
  let nextButton;

  /**
   * This gets triggered after the puzzle manager has a currentPuzzle for us
   */
  async function loadCurrentPuzzle() {
    if (!chessboard) {
      return;
    }

    resetPuzzleState();

    moves = chessboard.load($currentPuzzle.fen, $currentPuzzle.moves);
    // Puzzles start with the opponent's pre-move
    const firstUserMove = moves[1];
    orientation = firstUserMove.fullColor;

    const computerMove = $currentPuzzle.moves[0];

    setTimeout(() => {
      makeMove(computerMove);
    }, 700);
  }

  function makeMove(move) {
    if (chessboard) {
      chessboard.move(move);
      lastMoveIndexToShow = lastMoveIndexToShow + 1;
    }
  }

  async function handleUserMove(moveEvent) {
    if (isViewingHistory || puzzleComplete) {
      return;
    }

    // User moves get their own special highlighting
    chessboard.disableShowLastMove();
    const move = moveEvent.detail.move;
    const isCheckmate = move.isCheckmate;
    const correctMoveIndex = move.moveIndex;
    if (
      move.lan === moves[correctMoveIndex].lan ||
      isCheckmate ||
      puzzleComplete
    ) {
      chessboard.highlightSquare(move.to, "correct-move", 700);
      // Show the user move if it's correct
      lastMoveIndexToShow = lastMoveIndexToShow + 1;
      const computerMove = moves[correctMoveIndex + 1]
        ? moves[correctMoveIndex + 1].lan
        : null;
      if (computerMove) {
        setTimeout(() => {
          makeMove(computerMove);
          chessboard.enableShowLastMove();
        }, 300);
      } else {
        return await handlePuzzleComplete();
      }
    } else {
      madeMistake = true;
      const mistakeId = move.after;
      if (!mistakes.has(mistakeId)) {
        mistakes.set(mistakeId, move);
        mistakes = mistakes; // Reactivity
        if ($currentPuzzle.id) {
          void RailsAPI.saveMistake($currentPuzzle.id, move);
        }
      }
      // Override temporarily so it move highlight doesn't flash when undoing
      fenToHighlight = move.before;
      chessboard.highlightSquare(move.to, "incorrect-move", 400);
      setTimeout(() => {
        chessboard.enableShowLastMove();
        chessboard.undo();
      }, 300);
    }
  }

  let currentNode;
  let lastMove;

  function handleCurrentNode(event) {
    currentNode = event.detail;
    lastMove = currentNode.move;

    if (lastMove) {
      fenToHighlight = lastMove.after;
    } else {
      fenToHighlight = fen;
    }
  }

  async function handlePuzzleComplete() {
    const result = {
      user_puzzle_id: $currentPuzzle.id,
      made_mistake: madeMistake,
      duration: elapsedTime,
      themes: $currentPuzzle.themes,
      rating: $currentPuzzle.lichess_rating,
    };
    let message = madeMistake ? "Completed with mistake" : "Correct!";
    showSuccess(message);
    await puzzleManager.savePuzzleResult(result);
    puzzleComplete = true;
  }

  let successMessage = null;

  function showSuccess(message, duration = 1500) {
    successMessage = message;
    setTimeout(() => {
      successMessage = null;
    }, duration);
  }

  let userInfo = {};

  async function updateUserInfo() {
    userInfo = await RailsAPI.getUserInfo();
  }

  async function waitForImportComplete() {
    const userInfoInterval = setInterval(async () => {
      if (userInfo.import_in_progress) {
        await updateUserInfo();
        await puzzleManager.updateActivePuzzles();
      } else {
        clearInterval(userInfoInterval);
        await puzzleManager.updateActivePuzzles();
      }
    }, 2000);
  }

  let requiredConsecutiveSolves;
  let timeGoal;

  function initializeKeyboardShortcuts() {
    document.addEventListener("keydown", function (event) {
      if (["Enter", " "].includes(event.key) && nextButton) {
        event.preventDefault();
        nextButton.click();
      }
      if (event.key === "ArrowRight" && chessboard) {
        event.preventDefault();
        chessboard.historyForward();
      }
      if (event.key === "ArrowLeft" && chessboard) {
        event.preventDefault();
        chessboard.historyBack();
      }
    });
  }

  onMount(async () => {
    await Promise.all([initSettings(), updateUserInfo()]);
    if (userInfo.import_in_progress) {
      void waitForImportComplete();
    }
    initializeKeyboardShortcuts();
    timeGoal = await getSetting("puzzles.timeGoal");
    requiredConsecutiveSolves = await getSetting(
      "puzzles.consecutiveSolves",
      2,
    );
  });
</script>

{#if $puzzleMode === "failedLichess"}
  <PuzzleManager
    bind:this={puzzleManager}
    on:ready={async () => {
      loaded = true;
      await loadCurrentPuzzle();
    }} />
{:else if $puzzleMode === "lichessDrillMode"}
  <DrillModePuzzleManager
    bind:this={puzzleManager}
    on:ready={async () => {
      loaded = true;
      await loadCurrentPuzzle();
    }} />
{/if}
<div class="section pt-0 pl-0 pr-0">
  <div class="columns is-centered ml-0 mr-0">
    <div class="column is-6 pl-0 pr-0">
      {#if !loaded}
        <div class="block has-text-centered">
          <progress class="progress is-small is-primary" max="100" />
        </div>
      {/if}
      <div class="block">
        {#if $currentPuzzle && $currentPuzzle.lichess_puzzle_id}
          <div class="columns is-mobile is-vcentered ml-0 mr-0 mb-3">
            <div class="column is-narrow pb-0">
              <a
                href={`https://lichess.org/training/${$currentPuzzle.lichess_puzzle_id}`}
                class="puzzle-id"
                target="_blank"
                title="View on lichess.org">
                {$currentPuzzle.lichess_puzzle_id}
              </a>
            </div>
            <div class="column is-narrow pb-0">
              <div class="has-text-centered is-inline-block">
                {#key $currentPuzzle.fen}
                  <Spoiler
                    title="Rating"
                    minWidth="60"
                    isShown={puzzleComplete}>
                    <div>
                      {$currentPuzzle.lichess_rating}
                    </div>
                  </Spoiler>
                {/key}
              </div>
            </div>
            <div class="column is-narrow pb-0">
              <div class="has-text-centered is-inline-block">
                {#key $currentPuzzle.fen}
                  <Spoiler
                    title="Material"
                    minWidth="70"
                    isShown={puzzleComplete}>
                    <MaterialCounter bind:fen />
                  </Spoiler>
                {/key}
              </div>
            </div>
          </div>
          <div class="columns is-mobile is-vcentered mb-1 ml-0 mr-0">
            <div class="column is-full pb-1 pt-1">
              {#if $puzzleMode === "failedLichess"}
                {#key $currentPuzzle.id}
                  <ProgressBar bind:current={$currentPuzzle.percentage_complete}
                  ></ProgressBar>
                  <ResultTimeline bind:results={$currentPuzzle.results} bind:firstFailure={$currentPuzzle.first_failure} />
                {/key}
              {/if}
            </div>
          </div>
          <div class="mb-0 scrollable" style="min-height: 31px">
            {#key $currentPuzzle.id}
              {#each moves.slice(0, lastMoveIndexToShow) as move, i (move.after)}
                <button
                  in:fly={{ x: -30, duration: 300 }}
                  on:click={() => {
                    chessboard.goToFen(move.after);
                  }}
                  class="tag is-small move-tag button"
                  class:is-white={move.color === "w"}
                  class:is-black={move.color === "b"}>
                  {move.color === "w" || i === 0
                    ? move.fullMove
                    : ""}{move.color === "b" && i === 0
                    ? "... "
                    : move.color === "w"
                      ? ". "
                      : ""}{move.san}
                  {#if move.after === fenToHighlight}
                    <span
                      use:scrollIntoView
                      in:receive={{ key: "current-move-highlight" }}
                      out:send={{ key: "current-move-highlight" }}
                      class="active-move-tag">
                    </span>
                  {/if}
                </button>
              {/each}
            {/key}
          </div>
          <div class="block mb-1">
            <div class="board-container">
              {#if $currentPuzzle}
                {#key $currentPuzzle}
                  <FocusTimer bind:elapsedTime />
                {/key}
              {/if}
              <Chessboard
                bind:fen
                bind:moveTree
                bind:hasHistoryForward
                bind:hasHistoryBack
                bind:isViewingHistory
                bind:topStockfishMoves
                {chessgroundConfig}
                {orientation}
                bind:this={chessboard}
                on:enabledAnalysis={() => {
                  if (!puzzleComplete) {
                    madeMistake = true;
                  }
                }}
                on:move={handleUserMove}
                on:currentNode={handleCurrentNode}>
                <div slot="centered-content">
                  {#if successMessage}
                    <span transition:fade class="tag is-success is-size-4">
                      {successMessage}
                    </span>
                  {/if}
                </div>
                <div slot="buttons-left"></div>
                <div slot="buttons-right">
                  <button
                    class="button is-primary next-button ml-2"
                    class:is-invisible={!puzzleComplete}
                    bind:this={nextButton}
                    on:click={async () => {
                      // Do this first for spoiler animations
                      puzzleComplete = false;
                      await puzzleManager.updateCurrentPuzzle();
                      await loadCurrentPuzzle();
                    }}>
                    Next
                  </button>
                </div>
              </Chessboard>
            </div>
          </div>
          <DevOnly>
            <PuzzleBuilder />
          </DevOnly>
          <div class="block mt-1 ml-4 mr-4">
            {#if puzzleComplete && mistakeMoves.length > 0}
              <div class="block tags">
                {#each mistakeMoves as move (move)}
                  <button
                    class="tag is-warning"
                    title="View position after mistake"
                    on:click={() => {
                      chessboard.goToFen(move.after);
                    }}>
                    {move.fullMove}{move.color === "w" ? "." : "..."}{move.san}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <p>There are no current puzzles to play.</p>
        {/if}
      </div>
    </div>
    <div class="column is-4">
      <DevOnly>
        <div class="box">
          Timer: {(elapsedTime / 1000).toFixed(2)}s
          <div>
            <button
              class="button is-primary"
              on:click={() => {
                // copy fen to clipboard
                navigator.clipboard.writeText(fen);
              }}>
              Copy fen
            </button>
            <button
              class="button is-primary"
              on:click={() => {
                const chessInstance = new Chess();
                chessInstance.load(fen);
                navigator.clipboard.writeText(chessInstance.ascii());
              }}>
              Copy ASCII
            </button>
          </div>
          <div>
            {#each moves as move (move.after)}
              <div class:has-text-weight-bold={move.after === fenToHighlight}>
                {move.san}
              </div>
            {/each}
            <button
              disabled={!moves[lastMoveIndexToShow]}
              on:click={() => {
                const move = moves[lastMoveIndexToShow];
                if (move) {
                  makeMove(move);
                }
              }}
              class="button is-rust">
              Play next
            </button>
          </div>
        </div>
      </DevOnly>
      {#if $currentPuzzle}
        <div class="box">
          {#if fen}
            <h3 class="is-size-4">Analysis</h3>
            <div>
              <div class="field is-inline-block">
                <label class="label">
                  Depth
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      bind:value={$stockfishDepth}
                      min="10"
                      max="50" />
                  </div>
                </label>
              </div>
              <div class="field is-inline-block">
                <label class="label">
                  CPU Threads
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      bind:value={$stockfishCores}
                      min="1"
                      max="12" />
                  </div>
                </label>
              </div>
              <div class="field is-inline-block">
                <label class="label">
                  Lines
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      bind:value={$stockfishLines}
                      min="1"
                      max="100" />
                  </div>
                </label>
              </div>
              <br />
              {#if topStockfishMoves.length > 0}
                <table class="table is-striped is-narrow is-fullwidth">
                  <thead>
                    <tr>
                      <th>Move</th>
                      <th>Evaluation</th>
                      <th>Depth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each topStockfishMoves as move}
                      <tr>
                        <td>
                          <button
                            class="button is-small"
                            class:is-white={move.fullMove.color === "w"}
                            on:click|preventDefault={() => {
                              makeMove(move.fullMove.lan);
                            }}>
                            {move.fullMove.san}
                          </button>
                        </td>
                        <td>{move.scoreDisplay}</td>
                        <td>{move.depth}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>
          {/if}
        </div>
        {#if $activePuzzles.length > 0}
          <div class="box">
            <table class="table is-fullwidth is-narrow is-striped">
              <thead>
                <tr>
                  <th><abbr title="Lichess Puzzle ID">ID</abbr></th>
                  <th><abbr title="Percentage Complete">Progress</abbr></th>
                  <th><abbr title="Total correct solves">W</abbr></th>
                  <th><abbr title="Failure Count">L</abbr></th>
                </tr>
              </thead>
              <tbody>
                {#each $activePuzzles.sort(puzzleManager.sortPuzzlesBySolveTime) as puzzle (puzzle.id)}
                  <tr
                    animate:flip={{ duration: 400 }}
                    class:is-selected={$currentPuzzle.id === puzzle.id}>
                    <td class="puzzle-id">
                      {#if $currentPuzzle.lichess_puzzle_id}
                        <a
                          href={`https://lichess.org/training/${puzzle.lichess_puzzle_id}`}
                          target="_blank"
                          title="View on lichess.org">
                          {puzzle.lichess_puzzle_id}
                        </a>
                      {/if}
                    </td>
                    <td>
                      <ProgressBar bind:current={puzzle.percentage_complete}
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
      {/if}
      {#if $puzzleMode === "failedLichess"}
        <div class="box">
          <div class="block">
            {#if userInfo && !userInfo.has_lichess_token}
              <a href="/authenticate-with-lichess" class="button is-primary">
                Authenticate with Lichess to load puzzles
              </a>
            {:else if userInfo && userInfo.import_in_progress}
              <div class="block">
                <p>
                  Puzzle import in progress. This can take a long time,
                  especially the first time.
                </p>
                <progress class="progress is-small is-primary" max="100">
                </progress>
              </div>
            {:else}
              <button
                on:click={async () => {
                  await RailsAPI.triggerPuzzleImport();
                  userInfo = { ...userInfo, import_in_progress: true };
                  await waitForImportComplete();
                }}
                class="button is-primary">
                Fetch latest puzzles from lichess
              </button>
            {/if}
            <p>
              <strong>{$totalIncorrectPuzzlesCount}</strong>
              total puzzles
            </p>
            {#if $totalIncorrectPuzzlesCount !== $totalFilteredPuzzlesCount}
              <p>
                <strong>{$totalFilteredPuzzlesCount}</strong>
                puzzles after filtering
              </p>
            {/if}
            {#if $totalFilteredPuzzlesCount && $completedFilteredPuzzlesCount}
              <p>
                <strong>{$completedFilteredPuzzlesCount}</strong>
                of
                <strong>{$totalFilteredPuzzlesCount}</strong>
                completed
              </p>
              <ProgressBar
                automdaticColor={false}
                max={$totalFilteredPuzzlesCount}
                current={$completedFilteredPuzzlesCount} />
            {/if}
          </div>
        </div>
      {/if}

      {#if $puzzleMode === "lichessDrillMode"}
        <div class="box">
          <div class="content">
            <h3>Drill Mode</h3>
            <DrillModeLevelsTable />
            <button
              class="button is-danger"
              on:click={() => {
                RailsAPI.resetDrillModeLevels();
              }}>
              Reset levels
            </button>
          </div>
        </div>
      {/if}

      <CollapsibleBox title="Config" defaultOpen={true}>
        <div class="field">
          <label class="label" for="puzzle-mode-select">Puzzle Mode</label>
          <div class="control">
            <div class="select">
              <select
                id="puzzle-mode-select"
                bind:value={$puzzleMode}
                on:change={async () => {
                  loaded = false;
                }}>
                <option value="failedLichess">Failed Lichess Puzzles</option>
                <option value="lichessDrillMode">Lichess Drill Mode</option>
              </select>
            </div>
          </div>
        </div>

        {#if $puzzleMode === "failedLichess"}
          <PuzzleConfigForm />
        {/if}

        {#if $puzzleMode === "lichessDrillMode"}
          <DrillModeConfigForm />
        {/if}
      </CollapsibleBox>
    </div>
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }

  .board-container {
    position: relative;
  }

  .move-tag {
    position: relative;
    cursor: pointer;
    padding-left: 2px;
    padding-right: 2px;
    margin-right: 6px;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .move-tag.is-black {
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .move-tag:focus,
  .move-tag:hover {
    transform: scale(1.03);
    transition: transform 200ms ease-in-out;
    z-index: 5;
  }

  .active-move-tag {
    background-color: var(--brand-color-5);
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    height: 3px;
    width: 75%;
    border-radius: 10px;
  }
</style>
