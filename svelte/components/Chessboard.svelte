<script>
  import Fa from "svelte-fa";
  import { fade, crossfade, fly } from "svelte/transition";

  import { onDestroy, onMount } from "svelte";
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
  import { getKingSquareAttackers } from "./lib/chess_functions";
  import {
    faArrowLeft,
    faArrowRight,
    faFishFins,
    faRotateLeft,
  } from "@fortawesome/free-solid-svg-icons";
  import Stockfish from "./Stockfish.svelte";

  const INITIAL_SETUP =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
      lineWidth: 8,
    },
    brand3: {
      key: "brand3",
      color: Util.getRootCssVarValue("--brand-color-3"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand4: {
      key: "brand4",
      color: Util.getRootCssVarValue("--brand-color-4"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand5: {
      key: "brand5",
      color: Util.getRootCssVarValue("--brand-color-5"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand6: {
      key: "brand6",
      color: Util.getRootCssVarValue("--brand-color-6"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand7: {
      key: "brand7",
      color: Util.getRootCssVarValue("--brand-color-7"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand8: {
      key: "brand8",
      color: Util.getRootCssVarValue("--brand-color-8"),
      opacity: 0.85,
      lineWidth: 8,
    },
    brand9: {
      key: "brand9",
      color: Util.getRootCssVarValue("--brand-color-9"),
      opacity: 0.85,
      lineWidth: 8,
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

  let boardWrapper;
  let boardContainer;
  let showPromotion = false;
  let promotionColor = "white";
  let promotionFrom, promotionTo;

  // Stockfish
  export let hasStockfish = true;
  /** @type {Stockfish} */
  let stockfish;
  export let topStockfishMoves = [];
  let analysisEnabled = false;
  let readyToStartAnalyzing;

  $: {
    if (!analysisEnabled && stockfish) {
      stockfish.stopAnalysis();
      clearDrawings();
    }
  }

  $: {
    if (analysisEnabled && stockfish && fen) {
      stockfish.analyzePosition(fen);
    }
  }

  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen;
  export let chessground;
  export let isViewingHistory = false;
  export let hasHistoryBack = false;
  export let hasHistoryForward = false;

  let size;

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

  /** @type {MoveTree} */
  export let moveTree;

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
        color: currentNode().turnColor(),
        dests: currentNode().legalMoves(),
      },
    });

    fen = currentNode().getFen();
    updateHistoryState();
    dispatch("currentNode", currentNode());
  }

  function handleMove(from, to) {
    const isPromotion = (from, to) => {
      if (!currentNode()) {
        return false;
      }
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
    if (hasStockfish && stockfish) {
      stockfish.stopAnalysis();
      analysisEnabled = false;
      topStockfishMoves = [];
      clearDrawings();
    }
    moveTree = new MoveTree(fen);
    isViewingHistory = false;
    mainLineNodeId = null;
    mainLineFen = null;

    const fullMoves = [];
    moves.forEach((move) => {
      moveTree.addMove(move);
      fullMoves.push(moveTree.currentNode.move);
    });
    moveTree.goToRoot();
    updateChessground();
    return fullMoves;
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
    chessground.set({ drawable: { autoShapes: shapes } });
  }

  export function clearDrawings() {
    shapes = [];
    chessground.set({ drawable: { shapes: [], autoShapes: [] } });
  }

  export function showKingSafety(color = "w") {
    clearDrawings();
    const attackers = getKingSquareAttackers(fen, color);
    let brushIndex = 4;
    for (const attackingSquare in attackers) {
      const attackedSquares = attackers[attackingSquare];
      attackedSquares.forEach((attackedSquare) => {
        drawArrow(
          {
            from: attackingSquare,
            to: attackedSquare,
          },
          `brand${brushIndex}`,
        );
      });
      brushIndex += 1;
    }
  }

  export function drawStockfishArrows(topStockfishMoves) {
    clearDrawings();
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
          drawArrow(fullMove, arrowType);
        }
      });
    }
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

  function updateSize() {
    const boundingClientRect = boardWrapper.parentNode.getBoundingClientRect();
    size = Math.min(boundingClientRect.width, window.innerHeight * 0.73);
  }

  let resizeObserver;

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
      load(fen);
    } else {
      load(INITIAL_SETUP);
    }

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(boardWrapper.parentNode);
  });

  onDestroy(() => {
    chessground.destroy();
    resizeObserver.disconnect();
  });
</script>

{#if pieceSetOverride}
  <link
    id="piece-sprite"
    href="/piece-css/{pieceSetOverride}.css"
    rel="stylesheet" />
{:else}
  <link
    id="piece-sprite"
    href="/piece-css/{currentPieceSet}.css"
    rel="stylesheet" />
{/if}

<div class="block">
  <div
    class="board-wrapper"
    bind:this={boardWrapper}
    data-board={currentBoardStyle}>
    <div class="centered-content">
      <slot name="centered-content"></slot>
    </div>
    <div
      class="centered"
      style="position: relative;width: {size}px; height: {size}px">
      <div
        class="is2d"
        bind:this={boardContainer}
        style="position: relative;width: {size}px; height: {size}px">
      </div>
      <PromotionModal
        isOpen={showPromotion}
        color={promotionColor}
        on:select={(event) => selectPromotionPiece(event.detail.piece)}
        on:close={() => {
          showPromotion = false;
          updateChessground();
        }} />
    </div>
  </div>
</div>

<div
  class="block is-flex is-align-items-center is-justify-content-space-between">
  <div class="buttons mb-0">
    <slot name="buttons-left" />
    {#if !analysisEnabled}
      <button
        class="button is-dark-cyan is-small is-inline-block"
        title="Enable stockfish analysis"
        disabled={!readyToStartAnalyzing}
        on:click={() => {
          analysisEnabled = true;
          dispatch("enabledAnalysis");
        }}>
        <Fa icon={faFishFins} />
      </button>
    {:else}
      <button
        class="button is-tiffany-blue is-small is-inline-block"
        title="Stop analysis"
        on:click={() => {
          analysisEnabled = false;
          topStockfishMoves = [];
        }}>
        <Fa icon={faFishFins} spin={!readyToStartAnalyzing} />
      </button>
    {/if}
  </div>
  <div class="buttons mb-0">
    <button
      disabled={!hasHistoryBack}
      class="button is-primary history-button is-normal"
      on:click={historyBack}>
      <Fa icon={faArrowLeft} />
    </button>
    <button
      disabled={!hasHistoryForward}
      class="button is-primary history-button is-normal"
      on:click={historyForward}>
      <Fa icon={faArrowRight} />
    </button>
    <button
      in:fly={{ x: -30, duration: 300 }}
      class:is-invisible={!isViewingHistory}
      out:fade
      class="button is-primary history-button is-normal"
      on:click={backToMainLine}>
      <Fa icon={faRotateLeft} />
    </button>
  </div>
  <div class="buttons mb-0">
    <slot name="buttons-right" />
  </div>
</div>

{#if topStockfishMoves.length > 0}
  <div class="block">
    <div class="buttons">
      {#each topStockfishMoves as stockfishMove}
        <button
          class="button is-small stockfish-move"
          title={`Depth ${stockfishMove.depth}`}
          class:is-white={stockfishMove.fullMove.color === "w"}
          class:is-black={stockfishMove.fullMove.color === "b"}
          on:click={() => {
            move(stockfishMove.fullMove.lan);
          }}>
          <div class="has-text-centered">
            <div>
              {stockfishMove.fullMove.san}
            </div>
            <div>
              {stockfishMove.scoreDisplay}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if hasStockfish}
  <Stockfish
    bind:this={stockfish}
    bind:readyok={readyToStartAnalyzing}
    bind:analysisEnabled
    on:topmoves={(event) => {
      if (!analysisEnabled) {
        return;
      }
      topStockfishMoves = event.detail.topMoves;
      drawStockfishArrows(topStockfishMoves);
    }} />
{/if}

<style>
  .centered-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3; /* required to appear in front of pieces */
    opacity: 0.8;
  }

  .centered {
    margin-left: auto;
    margin-right: auto;
  }

  .history-button {
    touch-action: manipulation;
  }

  .stockfish-move {
    min-width: 75px;
  }
</style>
