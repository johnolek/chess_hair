<script>
  import { onMount } from "svelte";
  import { Chessground } from "chessground";
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
  import { MoveTree } from "./lib/MoveTree";

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
  export let isViewingHistory = false;
  export let hasHistoryBack = false;
  export let hasHistoryForward = false;

  let size;
  let minSize = 200;

  $: {
    if (chessground) {
      if (isViewingHistory) {
        enableShowLastMove();
      } else {
        disableViewOnly();
      }
    }
  }

  $: {
    if (isViewingHistory) {
      hasHistoryForward = history.length > 0;
    } else {
      hasHistoryForward = false;
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

  /** @type {MoveTree} */
  let moveTree;

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

  function updateChessground() {
    chessground.set({
      check: currentNode().inCheck(),
      fen: currentNode().getFen(),
      lastMove: currentNode().getLastMove(),
      turnColor: currentNode().turnColor(),
      movable: {
        free: false,
        dests: currentNode().legalMoves(),
      },
    });

    fen = currentNode().getFen();
    updateHistoryState();
    dispatch("currentNode", currentNode());
  }

  function handleMove(from, to) {
    const isPromotion = (from, to) => {
      const fromRank = from[1];
      const toRank = to[1];
      const piece = currentNode().pieceAtSquare(from);
      promotionColor = currentNode().turnColor();
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
      moveTree.addMove(`${from}${to}`);
      updateChessground();
      dispatch("move", { move: currentNode().move });
    }
  }

  function selectPromotionPiece(piece) {
    const move = currentNode().getFullMove({
      from: promotionFrom,
      to: promotionTo,
      promotion: piece,
    });
    if (move) {
      moveTree.addMove(move.lan);
      updateChessground();
      dispatch("move", { move });
    }
    showPromotion = false;
  }

  export function undo() {
    moveTree.goToParent();
    updateChessground();
  }

  let mainLineNodeId;
  let mainLineFen;
  let history = [];

  export function historyBack() {
    if (currentNode().parent) {
      history.unshift(currentNode().getGuid());
      history = history;
      goToFen(currentNode().parent.getFen());
      updateChessground();
    }
  }

  export function historyForward() {
    if (history.length > 0) {
      const nextNodeGuid = history.shift();
      history = history;
      moveTree.goToNode(nextNodeGuid);
      updateChessground();
    }
  }

  function updateHistoryState() {
    if (!currentNode()) {
      return;
    }
    hasHistoryBack = !!currentNode().parent;
    if (isViewingHistory) {
      if (
        currentNode().getGuid() === mainLineNodeId ||
        currentNode().getFen() === mainLineFen
      ) {
        isViewingHistory = false;
        mainLineNodeId = null;
        mainLineFen = null;
        history = [];
      }
    }
  }

  export function goToNode(nodeGuid) {
    if (currentNode().getGuid() === nodeGuid) {
      return;
    }

    if (!isViewingHistory) {
      isViewingHistory = true;
      mainLineNodeId = currentNode().getGuid();
      mainLineFen = currentNode().getFen();
    }

    moveTree.goToNode(nodeGuid);
    let node = currentNode();
    const newHistory = [];
    while (node.getFirstChild()) {
      node = node.getFirstChild();
      newHistory.push(node.getGuid());
    }
    history = newHistory;

    updateChessground();
  }

  export function goToFen(fen) {
    const matchingNode = moveTree.findNodeByFen(fen);
    goToNode(matchingNode.getGuid());
  }

  export function backToMainLine() {
    moveTree.goToNode(mainLineNodeId);
    updateChessground();
  }

  function currentNode() {
    return moveTree.currentNode;
  }

  export function enableViewOnly() {
    chessground.set({ viewOnly: true });
  }

  export function disableViewOnly() {
    chessground.set({ viewOnly: false });
  }

  export function move(uciMove) {
    moveTree.addMove(uciMove);
    updateChessground();
  }

  export function load(fen, moves = []) {
    moveTree = new MoveTree(fen);
    moves.forEach((move) => moveTree.addMove(move));
    moveTree.goToRoot();
    updateChessground();
  }

  export function enableShowLastMove() {
    chessground.set({ highlight: { lastMove: true } });
  }

  export function disableShowLastMove() {
    chessground.set({ highlight: { lastMove: false } });
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
