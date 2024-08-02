<script>
  import Chessboard from "./components/Chessboard.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import FocusTimer from "./components/FocusTimer.svelte";
  import Stockfish from "./components/Stockfish.svelte";
  import PuzzleManager from "./PuzzleManager.svelte";
  import { Util } from 'src/util';
  import { MoveTree } from "./components/lib/MoveTree";
  import { onMount } from "svelte";
  import { fade, crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Chess } from "chess.js";
  import CollapsibleBox from "./components/CollapsibleBox.svelte";
  import Spoiler from "./components/Spoiler.svelte";
  import { getSetting, initSettings } from "./settingsManager.js";
  import * as RailsAPI from "./railsApi";
  import Fa from "svelte-fa";
  import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";

  const [send, receive] = crossfade({ duration: 300 });

  // State stores
  import {
    activePuzzles,
    currentPuzzle,
    totalIncorrectPuzzlesCount,
    totalFilteredPuzzlesCount,
    completedFilteredPuzzlesCount,
  } from "./stores.js";
  import PuzzleConfigForm from "./PuzzleConfigForm.svelte";
  import DevOnly from "./components/DevOnly.svelte";

  /** @type {PuzzleManager} */
  let puzzleManager;
  let loaded = false;
  let fen;
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

  let correctMoveTree;
  let moves = [];
  let displayMoves = [];

  let madeMistake = false;
  let mistakes = [];
  let puzzleComplete = false;
  let elapsedTime = 0;

  function resetPuzzleState() {
    madeMistake = false;
    mistakes = [];
    puzzleComplete = false;
    elapsedTime = 0;
    lastMoveIndexToShow = 0;

    if (chessboard) {
      chessboard.enableShowLastMove();
    }

    recalculateMoves()

    if (analysisRunning) {
      analysisRunning = false;
      topStockfishMoves = [];
      stockfish.stopAnalysis();
    }
  }

  function recalculateMoves() {
    moves = [];
    displayMoves = [];

    if (!$currentPuzzle) {
      return;
    }
    correctMoveTree = new MoveTree($currentPuzzle.fen);
    $currentPuzzle.moves.forEach((uciMove) => {
      correctMoveTree.addMove(uciMove);
      moves.push(correctMoveTree.currentNode.move);
    });


    displayMoves = [];
    let startIndex = 0;

    // Handle the case where the first move is black's
    if (moves.length > 0 && moves[0].color === "b") {
      displayMoves.push([null, moves[0]]);
      startIndex = 1;
    }

    // Iterate over the moves array starting from the appropriate index
    for (let i = startIndex; i < moves.length; i += 2) {
      const whiteMove = moves[i] ? moves[i] : null;
      const blackMove = moves[i + 1] ? moves[i + 1] : null;
      displayMoves.push([whiteMove, blackMove]);
    }

    displayMoves = displayMoves; // reactivity
  }

  // History browsing
  let hasHistoryForward;
  let hasHistoryBack;
  let lastMoveIndexToShow = 0;
  let isViewingHistory;
  let historyBackButton;
  let historyForwardButton;

  // DOM elements
  let nextButton;

  async function loadCurrentPuzzle() {
    if (!chessboard) {
      return;
    }

    resetPuzzleState();

    const chessInstance = new Chess();
    chessInstance.load($currentPuzzle.fen);
    // It gets loaded 1 move before the user's move
    orientation = chessInstance.turn() === "w" ? "black" : "white";
    chessboard.load($currentPuzzle.fen);

    const computerMove = $currentPuzzle.moves[0];

    setTimeout(() => {
      makeMove(computerMove);
    }, 700);
  }

  function makeMove(move) {
    if (chessboard) {
      chessboard.move(move);
      lastMoveIndexToShow = lastMoveIndexToShow + 1;
      if (analysisRunning) {
        topStockfishMoves = [];
        stockfish.analyzePosition();
      }
    }
  }

  async function handleUserMove(moveEvent) {
    if (isViewingHistory || puzzleComplete) {
      return;
    }

    // User moves get their own special highlighting
    chessboard.disableShowLastMove();
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    const correctMoveIndex = move.moveIndex;
    if (
      move.lan === moves[correctMoveIndex].lan ||
      isCheckmate ||
      puzzleComplete
    ) {
      chessboard.highlightSquare(move.to, "correct-move", 700);
      // Show the user move if it's correct
      lastMoveIndexToShow = lastMoveIndexToShow + 1;
      const computerMove = moves[correctMoveIndex + 1] ? moves[correctMoveIndex + 1].lan : null;
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
      // Override temporarily so it move highlight doesn't flash when undoing
      fenToHighlight = move.before;
      chessboard.highlightSquare(move.to, "incorrect-move", 400);
      setTimeout(() => {
        chessboard.enableShowLastMove();
        chessboard.undo();
        mistakes = [...mistakes, move];
      }, 300);
    }
  }

  let currentNode;
  function handleCurrentNode(event) {
    currentNode = event.detail;
    if (currentNode.move) {
      fenToHighlight = currentNode.move.after;
    } else {
      fenToHighlight = fen;
    }
  }

  async function handlePuzzleComplete() {
    const result = {
      puzzle_id: $currentPuzzle.puzzle_id,
      made_mistake: madeMistake,
      duration: elapsedTime,
      mistakes: mistakes,
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
      if (event.key === "ArrowRight" && historyForwardButton) {
        event.preventDefault();
        historyForwardButton.click();
      }
      if (event.key === "ArrowLeft" && historyBackButton) {
        event.preventDefault();
        historyBackButton.click();
      }
    });
  }

  onMount(async () => {
    await initSettings();
    await updateUserInfo();
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

  // Stockfish
  /** @type {Stockfish} */
  let stockfish;
  let stockfishReady = false;
  let depth = 22;
  let numCores = 1;
  let lines = 5;
  let topStockfishMoves = [];
  let analysisRunning;

  $: {
    if (stockfish) {
      if (fen && analysisRunning) {
        stockfish.analyzePosition();
      }
      if (!analysisRunning) {
        if (stockfish) {
          stockfish.stopAnalysis();
        }
        chessboard.clearDrawings();
      }
    }
  }

  function drawStockfishArrows() {
    chessboard.clearDrawings();
    if (topStockfishMoves.length > 0) {
      const reversed = topStockfishMoves.slice().reverse();
      reversed.forEach((move) => {
        const fullMove = move.fullMove;
        const analysisFen = move.fen;
        if (fullMove !== null && analysisFen === fen) {
          let arrowType = "drawMove";
          if (move.score > 3 || (move.scoreType === "mate" && move.score > 0)) {
            arrowType = "greatMove";
          } else if (move.score > 1.25) {
            arrowType = "goodMove";
          } else if (move.score < -0.75) {
            arrowType = "badMove";
          }
          chessboard.drawArrow(fullMove, arrowType);
        }
      });
    }
  }
</script>

<PuzzleManager
  bind:this={puzzleManager}
  on:ready={async () => {
    loaded = true;
    await loadCurrentPuzzle();
  }}
/>
<div class="columns is-centered">
  <div class="column is-6">
    {#if !loaded}
      <div class="block has-text-centered">
        <h2>Loading</h2>
        <progress class="progress is-small is-primary" max="100" />
      </div>
    {/if}
    <div class="block">
      {#if $currentPuzzle}
        <div class="columns is-mobile is-vcentered mb-1">
          <div class="column is-narrow">
            <a
              href={`https://lichess.org/training/${$currentPuzzle.puzzle_id}`}
              class="puzzle-id"
              target="_blank"
              title="View on lichess.org">{$currentPuzzle.puzzle_id}</a
            >
          </div>
          <div class="column is-narrow">
            <div class="has-text-centered is-inline-block">
              {#key $currentPuzzle.puzzle_id}
                <Spoiler
                  title="Puzzle Rating"
                  minWidth="60"
                  isShown={puzzleComplete}
                >
                  <div>
                    {$currentPuzzle.rating}
                  </div>
                </Spoiler>
              {/key}
            </div>
          </div>
          <div class="column is-narrow">
            {#if $currentPuzzle.average_solve_time}
              <span
                class:has-text-warning={$currentPuzzle.average_solve_time >
                  timeGoal}
                class:has-text-success={$currentPuzzle.average_solve_time <=
                  timeGoal && $currentPuzzle.average_solve_time > 0}
                >{$currentPuzzle.average_solve_time.toFixed(2)}s</span
              >
            {/if}
          </div>
          <div class="column">
            {#key $currentPuzzle.puzzle_id}
              <ProgressBar
                max={requiredConsecutiveSolves}
                bind:current={$currentPuzzle.streak}
                className={$currentPuzzle.streak >= requiredConsecutiveSolves
                  ? "is-success"
                  : "is-warning"}
              ></ProgressBar>
            {/key}
          </div>
        </div>

        <div class="block mb-1">
          <div
            class="mb-1 scrollable "
            style="min-height: 28px"
          >
            {#key $currentPuzzle.puzzle_id}
              {#each moves.slice(0, lastMoveIndexToShow) as move (move.after)}
                <span
                  in:fade
                  class="tag is-small mobile-move"
                  class:is-white={move.color === "w"}
                  class:is-black={move.color === "b"}
                >
                  {move.fullMove}{move.color === "b" ? "... " : ". "}{move.san}
                  {#if move.after === fenToHighlight}
                    <span
                      in:receive={{ key: "current-move-highlight" }}
                      out:send={{ key: "current-move-highlight" }}
                      class="active-mobile-move"
                    ></span>
                  {/if}
                </span>
              {/each}
            {/key}
          </div>
          <div class="board-container">
            {#if $currentPuzzle}
              {#key $currentPuzzle.puzzle_id}
                <FocusTimer bind:elapsedTime />
              {/key}
            {/if}
            <Chessboard
              bind:fen
              bind:hasHistoryForward
              bind:hasHistoryBack
              bind:isViewingHistory
              {chessgroundConfig}
              {orientation}
              bind:this={chessboard}
              on:move={handleUserMove}
              on:currentNode={handleCurrentNode}
            >
              <div slot="centered-content">
                {#if successMessage}
                  <span transition:fade class="tag is-success is-size-4">
                    {successMessage}
                  </span>
                {/if}
              </div>
            </Chessboard>
          </div>
        </div>

        <div class="block">
          <div class="columns is-mobile has-text-centered is-vcentered">
            <div class="column has-text-left">
              {#if !analysisRunning}
                <button
                  class="button is-primary is-small"
                  class:is-danger={!puzzleComplete}
                  disabled={!stockfishReady}
                  on:click={() => {
                    analysisRunning = true;
                    madeMistake = true;
                  }}
                  >Enable Analysis
                </button>
              {:else}
                <button
                  class="button is-dark is-small is-inline-block"
                  on:click={() => {
                    analysisRunning = false;
                    topStockfishMoves = [];
                  }}
                  >Stop Analysis
                </button>
              {/if}
            </div>
            <div class="column has-text-left">
              <button
                disabled={!hasHistoryBack}
                class="button is-primary history-button is-normal is-responsive"
                bind:this={historyBackButton}
                on:click={() => {
                  chessboard.historyBack();
                  if (analysisRunning) {
                    topStockfishMoves = [];
                    stockfish.analyzePosition();
                  }
                }}>&#x276E;</button
              >
              <button
                disabled={!hasHistoryForward}
                class="button is-primary history-button is-normal is-responsive"
                bind:this={historyForwardButton}
                on:click={() => {
                  chessboard.historyForward();
                  if (analysisRunning) {
                    topStockfishMoves = [];
                    stockfish.analyzePosition();
                  }
                }}>&#x276F;</button
              >
              {#if isViewingHistory}
                <button
                  class="button is-primary history-button is-normal is-responsive"
                  on:click={() => {
                    chessboard.backToMainLine();
                  }}
                >
                  &nbsp;<Fa icon={faRotateLeft} />
                </button>
              {/if}
            </div>

            <div class="column has-text-right">
              <div class="is-inline-block"></div>
              {#if !puzzleComplete}
                <span class="tag is-{orientation} is-size-4 ml-2">
                  {orientation}
                </span>
              {:else}
                <button
                  class="button is-primary next-button ml-2"
                  bind:this={nextButton}
                  on:click={async () => {
                    await puzzleManager.updateCurrentPuzzle();
                    await loadCurrentPuzzle();
                  }}
                  >Next
                </button>
              {/if}
            </div>
          </div>
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
            }}>Copy fen</button
          >
          <button
            class="button is-primary"
            on:click={() => {
              const chessInstance = new Chess();
              chessInstance.load(fen);
              navigator.clipboard.writeText(chessInstance.ascii());
            }}>Copy ASCII</button
          >
        </div>
        <div>
          {#each moves as move (move.after)}
            <div class:has-text-weight-bold={move.after === fenToHighlight}>
              {move.san}
            </div>
          {/each}
        </div>
      </div>
    </DevOnly>
    {#if $currentPuzzle}
      <div class="box">
        {#if displayMoves.length > 0}
          <table class="table is-striped is-bordered is-fullwidth">
            <thead>
              <tr>
                <th>#</th>
                <th>White</th>
                <th>Black</th>
              </tr>
            </thead>
            <tbody>
              {#each displayMoves.slice(0, Math.ceil(lastMoveIndexToShow / 2)) as [whiteMove, blackMove]}
                {#if lastMoveIndexToShow > 0}
                  <tr in:fade>
                    <td>
                      {whiteMove ? whiteMove.fullMove : blackMove.fullMove}
                    </td>
                    <td
                      class:is-info={whiteMove && whiteMove.after === fenToHighlight}
                    >
                      {#if whiteMove && whiteMove.moveIndex < lastMoveIndexToShow}
                        <span in:fade>
                          {whiteMove.san}
                        </span>
                      {/if}
                    </td>
                    <td
                      class:is-info={blackMove && blackMove.after === fenToHighlight}
                    >
                      {#if blackMove && blackMove.moveIndex < lastMoveIndexToShow}
                        <span in:fade>
                          {blackMove.san}
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        {/if}
        {#if fen}
          <h3 class="is-size-4">Analysis</h3>
          <Stockfish
            bind:this={stockfish}
            bind:ready={stockfishReady}
            {fen}
            {depth}
            {numCores}
            {lines}
            on:topmoves={(event) => {
              if (!analysisRunning) {
                return;
              }
              topStockfishMoves = event.detail.topMoves;
              drawStockfishArrows();
            }}
          />
          <div>
            <div class="field is-inline-block">
              <label class="label"
                >Depth
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    bind:value={depth}
                    min="10"
                    max="50"
                    on:change={() => {
                      if (analysisRunning) {
                        topStockfishMoves = [];
                        stockfish.analyzePosition();
                      }
                    }}
                  />
                </div>
              </label>
            </div>
            <div class="field is-inline-block">
              <label class="label"
                >CPU Threads
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    bind:value={numCores}
                    min="1"
                    max="12"
                    on:change={() => {
                      if (analysisRunning) {
                        topStockfishMoves = [];
                        stockfish.analyzePosition();
                      }
                    }}
                  />
                </div>
              </label>
            </div>
            <div class="field is-inline-block">
              <label class="label"
                >Lines
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    bind:value={lines}
                    min="1"
                    max="100"
                    on:change={() => {
                      if (analysisRunning) {
                        topStockfishMoves = [];
                        stockfish.analyzePosition();
                      }
                    }}
                  />
                </div>
              </label>
            </div>
            <br />
            {#if !analysisRunning}
              <button
                class="button is-primary is-small"
                class:is-danger={!puzzleComplete}
                disabled={!stockfishReady}
                on:click={() => {
                  analysisRunning = true;
                  madeMistake = true;
                }}
                >Enable Analysis
              </button>
            {:else}
              <button
                class="button is-dark is-small"
                on:click={() => {
                  analysisRunning = false;
                  topStockfishMoves = [];
                }}
                >Stop Analysis
              </button>
            {/if}
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
                      <td>{move.fullMove.san}</td>
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
                <th><abbr title="Average solve time">Avg</abbr></th>
                <th><abbr title="Correct solves in a row">Streak</abbr></th>
                <th><abbr title="Total correct solves">Solves</abbr></th>
                <th><abbr title="Failure Count">Fails</abbr></th>
              </tr>
            </thead>
            <tbody>
              {#each $activePuzzles.sort(puzzleManager.sortPuzzlesBySolveTime) as puzzle (puzzle.puzzle_id)}
                <tr
                  animate:flip={{ duration: 400 }}
                  class:is-selected={$currentPuzzle.puzzle_id ===
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
            <progress class="progress is-small is-primary" max="100"></progress>
          </div>
        {:else}
          <button
            on:click={async () => {
              await RailsAPI.triggerPuzzleImport();
              userInfo = { ...userInfo, import_in_progress: true };
              await waitForImportComplete();
            }}
            class="button is-primary">Fetch latest puzzles from lichess</button
          >
        {/if}
        <p><strong>{$totalIncorrectPuzzlesCount}</strong> total puzzles</p>
        {#if $totalIncorrectPuzzlesCount !== $totalFilteredPuzzlesCount}
          <p>
            <strong>{$totalFilteredPuzzlesCount}</strong> puzzles after filtering
          </p>
        {/if}
        {#if $totalFilteredPuzzlesCount && $completedFilteredPuzzlesCount}
          <p>
            <strong>{$completedFilteredPuzzlesCount}</strong> of
            <strong>{$totalFilteredPuzzlesCount}</strong> completed
          </p>
          <ProgressBar
            max={$totalFilteredPuzzlesCount}
            current={$completedFilteredPuzzlesCount}
          />
        {/if}
      </div>
    </div>
    <CollapsibleBox title="Config" defaultOpen={true}>
      <PuzzleConfigForm />
    </CollapsibleBox>
  </div>
</div>

<style>
  .puzzle-id {
    font-family: monospace;
  }
  .history-button {
    touch-action: manipulation;
  }
  .board-container {
    position: relative;
  }
  .scrollable {
    overflow-x: auto;
    white-space: nowrap;
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
  }
  .scrollable::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
  .mobile-move {
    position: relative;
  }
  .active-mobile-move {
    background-color: var(--brand-color-5);
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    height: 3px;
    width: 90%;
  }
</style>
