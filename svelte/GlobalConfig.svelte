<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { boardOptions, pieceSetOptions } from "src/board/options";
  import { boardStyle, pieceSet } from "./stores";
  import { onMount } from "svelte";

  let pieceSetOverride;
  let boardStyleOverride;
  let originalBoard;

  $: {
    if (boardStyleOverride && document.body) {
      document.body.dataset.board = boardStyleOverride;
    }
    if (boardStyleOverride === null && document.body) {
      document.body.dataset.board = originalBoard;
    }
  }

  onMount(() => {
    originalBoard = document.body.dataset.board;
  });
</script>

<div class="columns">
  <div class="column is-one-third">
    <h2 class="is-size-2">Example Board</h2>
    <Chessboard {pieceSetOverride} {boardStyleOverride} />
  </div>
  <div class="column is-one-third">
    <h2 class="is-size-2">Piece Set</h2>
    {#each pieceSetOptions as option (option)}
      <label
        on:mouseenter={() => (pieceSetOverride = option)}
        on:focus={() => (pieceSetOverride = option)}
        on:mouseout={() => (pieceSetOverride = null)}
        on:blur={() => (pieceSetOverride = null)}
      >
        <div>
          <input
            name="pieceSet"
            type="radio"
            bind:group={$pieceSet}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>
  <div class="column is-one-third">
    <h2 class="is-size-2">Board Style</h2>
    {#each boardOptions as option (option)}
      <label
        on:mouseenter={() => (boardStyleOverride = option)}
        on:focus={() => (boardStyleOverride = option)}
        on:mouseout={() => (boardStyleOverride = null)}
        on:blur={() => (boardStyleOverride = null)}
      >
        <div>
          <input
            name="boardStyle"
            type="radio"
            bind:group={$boardStyle}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>
</div>
