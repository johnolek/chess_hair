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
  import PromotionModal from "./PromotionModal.svelte";
  import { Util } from "src/util";

  const customBrushes = {
    brand1: {
      key: "brand1",
      color: Util.getRootCssVarValue("--brand-color-1"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand2: {
      key: "brand2",
      color: Util.getRootCssVarValue("--brand-color-2"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand3: {
      key: "brand3",
      color: Util.getRootCssVarValue("--brand-color-3"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand4: {
      key: "brand4",
      color: Util.getRootCssVarValue("--brand-color-4"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand5: {
      key: "brand5",
      color: Util.getRootCssVarValue("--brand-color-5"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand6: {
      key: "brand6",
      color: Util.getRootCssVarValue("--brand-color-6"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand7: {
      key: "brand7",
      color: Util.getRootCssVarValue("--brand-color-7"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand8: {
      key: "brand8",
      color: Util.getRootCssVarValue("--brand-color-8"),
      opacity: 0.85,
      lineWidth: 15,
    },
    brand9: {
      key: "brand9",
      color: Util.getRootCssVarValue("--brand-color-9"),
      opacity: 0.85,
      lineWidth: 15,
    },
    goodMove: {
      key: "goodMove",
      color: Util.getRootCssVarValue("--bulma-success-30"),
      opacity: 0.85,
      lineWidth: 11,
    },
    greatMove: {
      key: "greatMove",
      color: Util.getRootCssVarValue("--bulma-success"),
      opacity: 1,
      lineWidth: 14,
    },
    drawMove: {
      key: "drawMove",
      color: Util.getRootCssVarValue("--bulma-grey-dark"),
      opacity: 1,
      lineWidth: 8,
    },
    badMove: {
      key: "badMove",
      color: Util.getRootCssVarValue("--bulma-danger"),
      opacity: 0.99,
      lineWidth: 5,
    },
  };

  let wrapperWidth;
  let boardContainer;
  let showPromotion = false;
  let promotionColor = "white";
  let promotionFrom, promotionTo;

  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen;
  export let chessground;
  export let moveIndex = 0;
  export let maxMoveIndex = 0;
  export let isViewingHistory = false;

  let size;
  let minSize = 200;

  $: {
    if (chessground) {
      if (isViewingHistory) {
        enableViewOnly();
        enableShowLastMove();
      } else {
        disableViewOnly();
      }
    }
  }

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

  let showingAlt = false;
  let chessInstance = new Chess();
  let alternateChessInstance = new Chess();

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

  function getLegalMoves(instance = chessInstance) {
    const moves = instance.moves({ verbose: true });
    const dests = new Map();
    moves.forEach((move) => {
      if (!dests.has(move.from)) dests.set(move.from, []);
      dests.get(move.from).push(move.to);
    });
    return dests;
  }

  function updateChessground(instance = chessInstance) {
    const legalMoves = getLegalMoves(instance);
    const history = chessInstance.history({ verbose: true });
    let lastMove = null;
    if (history && history[history.length - 1]) {
      lastMove = history[history.length - 1];
    }
    chessground.set({
      check: instance.inCheck(),
      fen: instance.fen(),
      lastMove: lastMove ? [lastMove.from, lastMove.to] : null,
      turnColor: instance.turn() === "w" ? "white" : "black",
      movable: {
        free: false,
        dests: legalMoves,
      },
    });

    fen = instance.fen();
  }

  function handleMove(from, to) {
    const isPromotion = (from, to) => {
      const fromRank = from[1];
      const toRank = to[1];
      const piece = chessInstance.get(from).type;
      promotionColor = chessInstance.turn() === "w" ? "white" : "black";
      return (
        piece === "p" &&
        ((fromRank === "7" && toRank === "8") ||
          (fromRank === "2" && toRank === "1"))
      );
    };

    if (isPromotion(from, to)) {
      showPromotion = true;
      promotionFrom = from;
      promotionTo = to;
      return;
    } else {
      const move = chessInstance.move({ from, to });
      if (move) {
        moveIndex += 1;
        maxMoveIndex += 1;
        updateChessground();
        dispatch("move", { move, isCheckmate: chessInstance.isCheckmate() });
      }
    }
  }

  function selectPromotionPiece(piece) {
    const move = chessInstance.move({
      from: promotionFrom,
      to: promotionTo,
      promotion: piece,
    });
    if (move) {
      updateChessground();
      dispatch("move", { move, isCheckmate: chessInstance.isCheckmate() });
    }
    showPromotion = false;
  }

  export function undo() {
    moveIndex = moveIndex - 1;
    maxMoveIndex = maxMoveIndex - 1;
    chessInstance.undo();
    updateChessground();
  }

  export function historyBack() {
    isViewingHistory = true;
    if (moveIndex > 0) {
      moveIndex = moveIndex - 1;
      chessInstance.undo();
      updateChessground();
    }
  }

  export function enableViewOnly() {
    chessground.set({ viewOnly: true });
  }

  export function disableViewOnly() {
    chessground.set({ viewOnly: false });
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
    moveIndex += 1;
    // This allows for making moves when viewing history
    if (!isViewingHistory) {
      maxMoveIndex = moveIndex;
    }
    if (moveIndex === maxMoveIndex) {
      isViewingHistory = false;
    }
    chessInstance.move(move);
    updateChessground();
  }

  export function load(fen) {
    moveIndex = 0;
    maxMoveIndex = 0;
    chessInstance.load(fen);
    updateChessground();
  }

  export function loadAlternate(fen) {
    showingAlt = true;
    alternateChessInstance.load(fen);
    updateChessground(alternateChessInstance);
  }

  export function restoreOriginal() {
    if (!showingAlt) {
      return;
    }
    showingAlt = false;
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

  let shapes = [];
  export function drawArrow(move, brush = "brand1") {
    const shape = {
      orig: move.from,
      dest: move.to,
      brush: brush,
    };
    shapes = [...shapes, shape];
    chessground.set({ drawable: { shapes: shapes } });
  }

  export function clearDrawings() {
    shapes = [];
    chessground.set({ drawable: { shapes: [] } });
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
      drawable: {
        brushes: customBrushes,
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
  <div style="position: relative;width: {size}px; height: {size}px">
    <div
      class="is2d"
      bind:this={boardContainer}
      style="position: relative;width: {size}px; height: {size}px"
    ></div>
    <div
      class="resizer"
      on:mousedown={startResizing}
      on:touchstart={startResizing}
      role="button"
      tabindex="0"
    ></div>
    <PromotionModal
      isOpen={showPromotion}
      color={promotionColor}
      on:select={(event) => selectPromotionPiece(event.detail.piece)}
      on:close={() => {
        showPromotion = false;
        updateChessground();
      }}
    />
  </div>
</div>

<style>
  .board-wrapper {
    position: relative;
    width: 99%; /* TODO: Figure out proper centering */
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
