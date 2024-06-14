<script>
  import { onMount, afterUpdate } from 'svelte';
  import LichessPgnViewer from 'lichess-pgn-viewer';

  export let game = {};
  let pgnViewerContainer;
  let reversedBoard;
  let pgnViewer;
  let reversedViewer;
  let mainWidth;
  let mainStyle;
  export let myColor = 'white';
  const otherColor = myColor === 'white' ? 'black' : 'white';

  onMount(() => {
    pgnViewer = LichessPgnViewer(pgnViewerContainer, {
      pgn: game.pgn,
      initialPly: 'last',
      orientation: myColor,
      scrollToMove: false,
    });
    reversedViewer = LichessPgnViewer(reversedBoard, {
      pgn: game.pgn,
      initialPly: 'last',
      orientation: otherColor,
      scrollToMove: false,
      showClocks: false,
      showControls: false,
    });
    let previousButton = pgnViewer.div.querySelector('.lpv__controls__goto--prev');
    previousButton.addEventListener('click', () => {
      reversedViewer.goTo('prev');
      pgnViewer.div.focus();
    });
    let nextButton = pgnViewer.div.querySelector('.lpv__controls__goto--next');
    nextButton.addEventListener('click', () => {
      reversedViewer.goTo('next');
      pgnViewer.div.focus();
    });
  });

  afterUpdate(() => {
    if (pgnViewer) {
      pgnViewer.redraw();
    }
  })
</script>

<div class="fixed-grid has-2-cols">
  <div class="grid">
    <div class="cell">
      <div class="is2d" id={game.url} bind:this={pgnViewerContainer}></div>
    </div>
    <div class="cell">
      <div class="is2d reversed" id="{game.url}-reversed" bind:this={reversedBoard}></div>
    </div>
  </div>
  <hr/>
</div>

<style>
</style>
