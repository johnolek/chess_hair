<script>
  import { onMount } from "svelte";
  import { Chessground } from "chessground";
  import { Chess } from "chess.js";
  import { pieceSet } from "../stores";
  import { createEventDispatcher } from "svelte";

  let boardContainer;
  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen;
  export let lastMove = null;
  export let chessground;
  export let size;

  let chessInstance = new Chess();
  export let pieceSetOverride = null;
  export let boardStyleOverride = null;

  const dispatch = createEventDispatcher();

  let maxWidth = "70vh";

  $: {
    if (orientation && chessground) {
      chessground.set({ orientation: orientation });
    }
  }

  $: {
    if (fen && chessground) {
      if (lastMove) {
        chessInstance.load(lastMove.before);
        setTimeout(() => {
          move(lastMove.san);
          chessground.set({ lastMove: [lastMove.from, lastMove.to] });
        }, 500);
      } else {
        chessInstance.load(fen);
      }
      updateChessground();
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
    chessground.set({
      fen: chessInstance.fen(),
      movable: {
        free: false,
        dests: legalMoves,
      },
    });
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
      const choice = prompt("Promote pawn to (q, r, b, n):");
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

  export function move(move) {
    chessInstance.move(move);
    updateChessground();
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
  style="max-width: {maxWidth}"
  bind:clientWidth={size}
>
  <div class="centered-content">
    <slot name="centered-content"></slot>
  </div>
  <div
    class="is2d {boardStyleOverride ? boardStyleOverride : ''}"
    bind:this={boardContainer}
    style="position: relative;width: {size}px; height: {size}px"
  ></div>
  <div class="block mt-2">
    <slot name="below-board"></slot>
  </div>
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
