<script>
  import { onMount } from "svelte";
  import { Chessground } from "chessground";
  import { Chess } from "chess.js";
  import {
    pieceSet,
    boardStyle,
    whiteBoardStyle,
    blackBoardStyle,
    whitePieceSet,
    blackPieceSet,
  } from "../stores";
  import { createEventDispatcher } from "svelte";

  let wrapperWidth;
  let boardContainer;
  let resizer;
  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen;
  export let chessground;
  let size;
  let minSize = 200;

  let isResizing = false;
  let resized = false;
  let startX, startY, startSize;

  function startResizing(event) {
    isResizing = true;
    resized = true;
    startX = event.touches ? event.touches[0].clientX : event.clientX;
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    startSize = size;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", stopResizing);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", stopResizing);
  }

  function onMove(event) {
    if (!isResizing) return;
    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dx = clientX - startX;
    const dy = clientY - startY;
    let newSize = Math.max(startSize + dx, startSize + dy);
    if (newSize < minSize) {
      newSize = minSize;
    }
    if (newSize > wrapperWidth) {
      newSize = wrapperWidth;
    }
    size = newSize;
  }

  function stopResizing() {
    isResizing = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", stopResizing);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", stopResizing);
  }

  let chessInstance = new Chess();
  export let pieceSetOverride = null;
  export let boardStyleOverride = null;

  let currentBoardStyle = $boardStyle;
  let currentPieceSet = $pieceSet;

  let customHighlights = new Map();
  customHighlights.set("a1", "testing2");

  $: {
    if (customHighlights && chessground) {
      chessground.set({ highlight: { custom: customHighlights } });
    }
  }

  $: {
    if (boardStyleOverride) {
      currentBoardStyle = boardStyleOverride;
    } else {
      if (orientation === "white" && $whiteBoardStyle) {
        currentBoardStyle = $whiteBoardStyle;
        currentPieceSet = $whitePieceSet;
      } else if (orientation === "black" && $blackBoardStyle) {
        currentBoardStyle = $blackBoardStyle;
        currentPieceSet = $blackPieceSet;
      } else {
        currentBoardStyle = $boardStyle;
        currentPieceSet = $pieceSet;
      }
    }
  }

  const dispatch = createEventDispatcher();

  $: {
    if (orientation && chessground) {
      chessground.set({ orientation: orientation });
    }
  }

  function getLegalMoves() {
    const moves = chessInstance.moves({ verbose: true });
    const dests = new Map();
    moves.forEach((move) => {
      if (!dests.has(move.from)) dests.set(move.from, []);
      dests.get(move.from).push(move.to);
    });
    return dests;
  }

  function updateChessground() {
    const legalMoves = getLegalMoves();
    const history = chessInstance.history({ verbose: true });
    let lastMove = null;
    if (history && history[history.length - 1]) {
      lastMove = history[history.length - 1];
    }
    chessground.set({
      check: chessInstance.inCheck(),
      fen: chessInstance.fen(),
      lastMove: lastMove ? [lastMove.from, lastMove.to] : null,
      turnColor: chessInstance.turn() === "w" ? "white" : "black",
      movable: {
        free: false,
        dests: legalMoves,
      },
    });

    fen = chessInstance.fen();
  }

  function handleMove(from, to) {
    const isPromotion = (from, to) => {
      const fromRank = from[1];
      const toRank = to[1];
      const piece = chessInstance.get(from).type;
      return (
        piece === "p" &&
        ((fromRank === "7" && toRank === "8") ||
          (fromRank === "2" && toRank === "1"))
      );
    };

    let promotion = "q"; // Default to queen

    if (isPromotion(from, to)) {
      const choice = prompt("Promote pawn to (q, r, b, n):", "q");
      if (["q", "r", "b", "n"].includes(choice)) {
        promotion = choice;
      }
    }

    const move = chessInstance.move({ from, to, promotion });
    if (move) {
      updateChessground();
      dispatch("move", { move, isCheckmate: chessInstance.isCheckmate() });
    }
  }

  export function undo() {
    chessInstance.undo();
    updateChessground();
  }

  export function reset() {
    chessInstance.reset();
    updateChessground();
  }

  export function clear() {
    chessInstance.clear();
    updateChessground();
  }

  export function move(move) {
    chessInstance.move(move);
    updateChessground();
  }

  export function load(fen) {
    chessInstance.load(fen);
    updateChessground();
  }

  export function enableShowLastMove() {
    chessground.set({ highlight: { lastMove: true } });
  }

  export function disableShowLastMove() {
    chessground.set({ highlight: { lastMove: false } });
  }

  export function setLastMove(lastMove) {
    chessground.set({ lastMove });
  }

  export function highlightSquare(square, className, duration) {
    customHighlights.set(square, className);
    customHighlights = customHighlights;

    // Set a timeout to remove the highlight after the specified duration
    setTimeout(() => {
      customHighlights.delete(square);
      customHighlights = customHighlights;
    }, duration);
  }

  onMount(() => {
    chessground = Chessground(boardContainer, {
      ...chessgroundConfig,
      fen: chessInstance.fen(),
      movable: {
        events: {
          after: handleMove,
        },
      },
    });
    if (fen) {
      this.load(fen);
    }
    size = boardContainer.clientWidth;

    window.addEventListener("resize", () => {
      if (size > wrapperWidth) {
        size = wrapperWidth;
      }
      if (!resized) {
        size = wrapperWidth;
      }
    });

    setTimeout(() => {
      // Allow the board to render before adding the resizer
      boardContainer.appendChild(resizer);
    }, 100);
  });
</script>

{#if pieceSetOverride}
  <link
    id="piece-sprite"
    href="/piece-css/{pieceSetOverride}.css"
    rel="stylesheet"
  />
{:else}
  <link
    id="piece-sprite"
    href="/piece-css/{currentPieceSet}.css"
    rel="stylesheet"
  />
{/if}

<div
  class="board-wrapper"
  bind:clientWidth={wrapperWidth}
  data-board={currentBoardStyle}
>
  <div class="centered-content">
    <slot name="centered-content"></slot>
  </div>
  <div
    class="is2d"
    bind:this={boardContainer}
    style="position: relative;width: {size}px; height: {size}px"
  ></div>
  <div
    bind:this={resizer}
    class="resizer"
    on:mousedown={startResizing}
    on:touchstart={startResizing}
    role="button"
    tabindex="0"
  ></div>
</div>

<style>
  .board-wrapper {
    position: relative;
    width: 100%;
  }

  .centered-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3; /* required to appear in front of pieces */
    opacity: 0.8;
  }

  /* Add these styles for the resizer */
  .resizer {
    position: absolute;
    width: 10px;
    height: 10px;
    bottom: -5px;
    right: -5px;
    cursor: nwse-resize;
    background-color: transparent;
    touch-action: none;
    user-select: none;
  }

  .resizer:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>
