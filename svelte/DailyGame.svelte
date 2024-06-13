<script>
  import { onMount, afterUpdate } from 'svelte';
  import LichessPgnViewer from 'lichess-pgn-viewer';

  import { crossfade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const [send, receive] = crossfade({
    duration: 1500,
    easing: quintOut
  });

  export let game = {};
  let boardDiv;
  let pgnViewer;
  export let myColor = 'white';

  onMount(() => {
    setTimeout(() => {
      pgnViewer = LichessPgnViewer(boardDiv, {
        pgn: game.pgn,
        initialPly: 'last',
        orientation: myColor,
        scrollToMove: false,
      });
    });
  });

  afterUpdate(() => {
    if (pgnViewer) {
      pgnViewer.redraw();
    }
  })
</script>

<div
  in:receive={{ key: game.url }}
  out:send={{ key: game.url }}
  class="game" id={game.url} data-last-activity={parseInt(game.last_activity)}>
  <a href={game.url} target="_blank">chess.com</a>
  <div class="is2d" id={game.url} bind:this={boardDiv}></div>
</div>

<style>
  .game {
    margin-right: 20px;
    display: inline-block;
    width: 600px;
    max-width: 90vw;

  }
</style>
