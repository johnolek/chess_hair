<script>
  let orientation = "white";
  /** @type {Chessboard} */
  let chessboard;
  let moveTree;
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
  let pgn;

  import Chessboard from "./Chessboard.svelte";

  function loadFen() {
    if (!fen || !chessboard) {
      return;
    }

    chessboard.load(fen);
  }

  function loadPgn() {
    if (!pgn || !chessboard) {
      return;
    }

    chessboard.loadPgn(pgn);
  }

  let isRecording = false;
  let premoveFen;
  let moves = [];
</script>

<div class="block">
  <Chessboard
    bind:this={chessboard}
    bind:moveTree
    {chessgroundConfig}
    on:currentNode={(event) => {
      const node = event.detail;
      if (isRecording && node) {
        moves.push(node.move.lan);
      }
    }}>
    <div slot="buttons-right">
      <button
        class="button is-primary"
        disabled={isRecording}
        on:click={() => {
          isRecording = true;
          premoveFen = moveTree?.currentNode?.parent?.getFen();
          if (!premoveFen) {
            return;
          }
          moves = [moveTree.currentNode.move.lan];
        }}>
        R
      </button>
      <button
        class="button is-primary"
        disabled={!isRecording}
        on:click={() => {
          isRecording = false;
          const newPuzzleParams = {
            fen: premoveFen,
            moves: moves,
          };
          console.log(newPuzzleParams);
          premoveFen = null;
          moves = [];
        }}>
        C
      </button>
    </div>
  </Chessboard>
  <div class="field">
    <label class="label">
      Fen
      <div class="control">
        <input type="text" bind:value={fen} />
      </div>
    </label>
  </div>
  <button class="button is-primary" on:click={loadFen}>Load FEN</button>

  <textarea class="textarea" bind:value={pgn}></textarea>
  <button class="button is-primary" on:click={loadPgn}>Load PGN</button>
</div>
