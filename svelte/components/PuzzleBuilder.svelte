<script>
  let orientation = "white";
  /** @type {Chessboard} */
  let chessboard;
  let chessgroundConfig = {
    coordinates: true,
    animation: {
      enabled: true,
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    draggable: {
      enabled: true,
    },
    selectable: {
      enabled: true,
    },
    movable: {
      free: false,
      color: "both",
      dests: new Map(),
    },
    orientation: orientation,
  };
  let fen;

  import Chessboard from "./Chessboard.svelte";

  function loadFen() {
    if (!fen || !chessboard) {
      return;
    }

    chessboard.load(fen);
  }
</script>

<div class="block">
  <Chessboard bind:this={chessboard} {chessgroundConfig} />
  <div class="field">
    <label class="label">
      Fen
      <div class="control">
        <input type="text" bind:value={fen} />
      </div>
    </label>
  </div>
  <button class="button is-primary" on:click={loadFen}>Load FEN</button>
</div>
