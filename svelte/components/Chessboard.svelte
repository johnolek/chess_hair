<script>
  import { onMount } from "svelte";
  import { Chessground } from "chessground";
  import { pieceSet } from "../stores";

  let boardContainer;
  export let chessgroundConfig = {};
  export let orientation = "white";

  export let fen = null;

  $: {
    if (chessground && fen) {
      chessground.set({
        fen: fen,
        highlight: {
          lastMove: false,
          check: false,
        },
      });
    }
  }

  export let chessground;
  export let size;

  export let pieceSetOverride = null;
  export let boardStyleOverride = null;

  let maxWidth = "70vh";

  $: {
    if (orientation && chessground) {
      chessground.set({ orientation: orientation });
    }
  }

  onMount(() => {
    chessground = Chessground(boardContainer, chessgroundConfig);
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
