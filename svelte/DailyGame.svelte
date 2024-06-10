<script>
  import { onMount } from 'svelte';
  import LichessPgnViewer from 'lichess-pgn-viewer';

  export let game = {};
  let boardDiv;
  export let myColor = 'white';

  onMount(() => {
    setTimeout(() => {
      LichessPgnViewer(boardDiv, {
        pgn: game.pgn,
        initialPly: 'last',
        orientation: myColor,
        scrollToMove: false,
      });
    });
  });
</script>

<div class="game" id={game.url} data-last-activity={parseInt(game.last_activity)}>
  <a href={game.url} target="_blank">chess.com</a>
  <div class="is2d" id={game.url} bind:this={boardDiv}></div>
</div>
