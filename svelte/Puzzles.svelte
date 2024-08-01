<script>
  import Chessboard from "./components/Chessboard.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import FocusTimer from "./components/FocusTimer.svelte";
  import Stockfish from "./components/Stockfish.svelte";
  import PuzzleManager from "./PuzzleManager.svelte";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { Chess } from "chess.js";
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
  } from "./stores.js";
  import PuzzleConfigForm from "./PuzzleConfigForm.svelte";
  import DevOnly from "./components/DevOnly.svelte";

  /** @type {PuzzleManager} */
  let puzzleManager;
  let loaded = false;
  let fen;

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
  let displayMoves = [];

  currentPuzzle.subscribe((puzzle) => {
    if (!puzzle) {
      return;
    }
    moves = [];
    const chessInstance = new Chess();
    chessInstance.load(puzzle.fen);
    puzzle.moves.forEach((uciMove, index) => {
      const fullMove = chessInstance.moveNumber();
      const move = {
        ...chessInstance.move(uciMove),
        index: index,
        fullMove: fullMove,
      };
      moves.push(move);
    });
    displayMoves = [];
    let startIndex = 0;

    // Handle the case where the first move is black's
    if (moves.length > 0 && moves[0].color === "b") {
      displayMoves.push([null, { ...moves[0], index: 0 }]);
      startIndex = 1;
    }

    // Iterate over the moves array starting from the appropriate index
    for (let i = startIndex; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = moves[i + 1] ? moves[i + 1] : null;
      displayMoves.push([whiteMove, blackMove]);
    }
  });

  let madeMistake = false;
  let mistakes = [];
  let puzzleComplete = false;
  let elapsedTime = 0;

  function resetPuzzleState() {
    madeMistake = false;
    mistakes = [];
    puzzleComplete = false;
    elapsedTime = 0;
    moveIndex = 0;
    maxMoveIndex = 0;
    isViewingHistory = false;
    if (chessboard) {
      chessboard.enableShowLastMove();
    }
    if (analysisRunning) {
      analysisRunning = false;
      topStockfishMoves = [];
      stockfish.stopAnalysis();
    }
  }

  // History browsing
  let isViewingHistory = false;
  let moveIndex = 0;
  let lastMoveIndex = 0;
  let maxMoveIndex = 0;
  let historyBackButton;
  let historyForwardButton;

  $: lastMoveIndex = Math.max(moveIndex - 1, 0);

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
      chessboard.move(computerMove);
      moveIndex = 1;
      maxMoveIndex = 1;
    }, 700);
  }

  function makeMove(move) {
    if (chessboard) {
      chessboard.move(move);
      moveIndex = moveIndex + 1;
      if (moveIndex === maxMoveIndex) {
        isViewingHistory = false;
      }
      if (analysisRunning) {
        topStockfishMoves = [];
        stockfish.analyzePosition();
      }
    }
  }

  async function handleUserMove(moveEvent) {
    chessboard.disableShowLastMove();
    const move = moveEvent.detail.move;
    const isCheckmate = moveEvent.detail.isCheckmate;
    if (move.lan === moves[moveIndex].lan || isCheckmate || puzzleComplete) {
      moveIndex = moveIndex + 1;
      maxMoveIndex = maxMoveIndex + 1;
      chessboard.highlightSquare(move.to, "correct-move", 700);
      const computerMove = moves[moveIndex] ? moves[moveIndex].lan : null;
      if (computerMove) {
        setTimeout(() => {
          maxMoveIndex = maxMoveIndex + 1;
          makeMove(computerMove);
          chessboard.enableShowLastMove();
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
        mistakes = [...mistakes, move];
      }, 300);
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
        <div class="block">
          <div class="columns is-mobile">
            <div class="column">
              <a
                href={`https://lichess.org/training/${$currentPuzzle.puzzle_id}`}
                class="puzzle-id"
                target="_blank"
                title="View on lichess.org">{$currentPuzzle.puzzle_id}</a
              >
            </div>
            <div class="column">
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
            <div class="column is-two-thirds">
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
        </div>

        <div class="block mb-1">
          <div
            class="is-hidden-tablet mb-1 scrollable"
            style="min-height: 25px"
          >
            {#key $currentPuzzle.puzzle_id}
              {#each moves.slice(0, moveIndex) as move, i}
                <span
                  in:fade
                  class="tag is-small"
                  class:is-white={move.color === "w"}
                  class:is-black={move.color === "b"}
                >
                  {move.fullMove}
                  {move.color === "b" ? "... " : ". "}{move.san}</span
                >
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
            <div class="column has-text-centered">
              <div>
                <button
                  disabled={moveIndex === 0}
                  class="button is-primary history-button"
                  bind:this={historyBackButton}
                  on:click={() => {
                    isViewingHistory = true;
                    moveIndex -= 1;
                    chessboard.undo();
                    if (analysisRunning) {
                      topStockfishMoves = [];
                      stockfish.analyzePosition();
                    }
                  }}>&#x276E;</button
                >
                <button
                  disabled={moveIndex === maxMoveIndex}
                  class="button is-primary history-button"
                  bind:this={historyForwardButton}
                  on:click={() => {
                    makeMove(moves[moveIndex].lan);
                  }}>&#x276F;</button
                >
              </div>
              <div class="has-text-centered">
                <div>Rating</div>
                {#key $currentPuzzle.puzzle_id}
                  <Spoiler minWidth="70" isShown={puzzleComplete}>
                    <div>
                      {$currentPuzzle.rating}
                    </div>
                  </Spoiler>
                {/key}
              </div>
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
          {#each moves as move, i}
            <div class:has-text-weight-bold={moveIndex === i}>{move.san}</div>
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
              {#each displayMoves as [whiteMove, blackMove]}
                {#if (whiteMove && whiteMove.index <= maxMoveIndex - 1) || (blackMove && blackMove.index <= maxMoveIndex - 1)}
                  <tr in:fade>
                    <td>
                      {whiteMove ? whiteMove.fullMove : blackMove.fullMove}
                    </td>
                    <td
                      class:is-info={whiteMove &&
                        whiteMove.index === lastMoveIndex}
                    >
                      {#if whiteMove && whiteMove.index < maxMoveIndex}
                        <span in:fade>
                          {whiteMove.san}
                        </span>
                      {/if}
                    </td>
                    <td
                      class:is-info={blackMove &&
                        blackMove.index === lastMoveIndex}
                    >
                      {#if blackMove && blackMove.index < maxMoveIndex}
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
</style>
