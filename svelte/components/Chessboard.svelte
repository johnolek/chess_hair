<script>
  import { onMount } from "svelte";
  import { Chessground } from "chessground";
  import { Chess } from "chess.js";
  import {
    pieceSet,
    boardStyle,
    whiteBoardStyle,
    blackBoardStyle,
  } from "../stores";
  import { createEventDispatcher } from "svelte";

  let boardContainer;
  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen;
  export let chessground;
  export let size;

  let chessInstance = new Chess();
  export let pieceSetOverride = null;
  export let boardStyleOverride = null;

  let currentBoardStyle = $boardStyle;

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
      } else if (orientation === "black" && $blackBoardStyle) {
        currentBoardStyle = $blackBoardStyle;
      } else {
        currentBoardStyle = $boardStyle;
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
  });
</script>

{#if pieceSetOverride}
  <link
    id="piece-sprite"
    href="/piece-css/{pieceSetOverride}.css"
    rel="stylesheet"
  />
{:else}
  <link id="piece-sprite" href="/piece-css/{$pieceSet}.css" rel="stylesheet" />
{/if}

<div
  class="board-wrapper"
  bind:clientWidth={size}
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
</style>
