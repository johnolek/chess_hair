<script>
  import { onMount, afterUpdate } from 'svelte';
  import LichessPgnViewer from '../vendor/javascript/lichess-pgn-viewer.min';

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
      menu: {
        analysisBoard: {
          enabled: false,
        },
        practiceWithComputer: {
          enabled: false,
        }
      }
    });
    reversedViewer = LichessPgnViewer(reversedBoard, {
      pgn: game.pgn,
      initialPly: 'last',
      orientation: otherColor,
      scrollToMove: false,
      showClocks: false,
      showControls: false,
      menu: {
        analysisBoard: {
          enabled: false,
        },
        practiceWithComputer: {
          enabled: false,
        },
      }
    });
    pgnViewer.div.addEventListener('pathChange', (event) => {
      reversedViewer.toPath(event.detail.path)
    })
  });

  afterUpdate(() => {
    if (pgnViewer) {
      pgnViewer.redraw();
    }
  })
</script>

<div class="block">
  <div class="fixed-grid has-2-cols">
    <div class="box">
      <div class="block">
        <a href={game.url} class="button is-link is-small" target="_blank">Chess.com</a>
      </div>
      <div class="grid">
        <div class="cell">
          <div class="is2d" id={game.url} bind:this={pgnViewerContainer}></div>
        </div>
        <div class="cell">
          <div class="is2d reversed" id="{game.url}-reversed" bind:this={reversedBoard}></div>
        </div>
      </div>
    </div>
  </div>
</div>


<style>
</style>
