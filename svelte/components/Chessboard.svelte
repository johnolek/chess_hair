<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { pieceSet } from '../stores';

  let boardContainer;
  export let chessgroundConfig = {};
  export let orientation = 'white';

  export let fen = null;

  $: {
    if (chessground && fen) {
      chessground.set({
        fen: fen,
        highlight: {
          lastMove: false,
          check: false,
        }
      })
    }
  }

  export let chessground;

  export let size;
  let maxWidth = '70vh';

  $: {
    if (orientation && chessground) {
      chessground.set({orientation: orientation});
    }
  }

  onMount(() => {
    chessground = Chessground(boardContainer, chessgroundConfig);
  });
</script>

<link id="piece-sprite" href="/piece-css/{$pieceSet}.css" rel="stylesheet">

<div class="board-wrapper" style="max-width: {maxWidth}" bind:clientWidth={size}>
  <div
    class="is2d"
    bind:this={boardContainer}
    style="position: relative;width: {size}px; height: {size}px">
  </div>
</div>

<style>
  .board-wrapper {
    position: relative;
    width: 100%;
  }
</style>
