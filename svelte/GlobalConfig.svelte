<script>
  import Chessboard from "./components/Chessboard.svelte";
  import { boardOptions, pieceSetOptions } from "src/board/options";
  import {
    boardStyle,
    whiteBoardStyle,
    blackBoardStyle,
    pieceSet,
    whitePieceSet,
    blackPieceSet,
  } from "./stores";

  let pieceSetOverride;
  let boardStyleOverride;
</script>

<div class="columns">
  <div class="column is-one-third">
    <h2 class="is-size-2">Example Board</h2>
    <Chessboard {pieceSetOverride} bind:boardStyleOverride />
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
<div class="columns">
  <div class="column is-one-third">
    <h2 class="is-size-2">Board Style (white)</h2>
    {#each boardOptions as option (option)}
      <label
        on:mouseenter={() => (boardStyleOverride = option)}
        on:focus={() => (boardStyleOverride = option)}
        on:mouseout={() => (boardStyleOverride = null)}
        on:blur={() => (boardStyleOverride = null)}
      >
        <div>
          <input
            name="whiteBoardStyle"
            type="radio"
            bind:group={$whiteBoardStyle}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>

  <div class="column is-one-third">
    <h2 class="is-size-2">Piece Set (white)</h2>
    {#each pieceSetOptions as option (option)}
      <label
        on:mouseenter={() => (pieceSetOverride = option)}
        on:focus={() => (pieceSetOverride = option)}
        on:mouseout={() => (pieceSetOverride = null)}
        on:blur={() => (pieceSetOverride = null)}
      >
        <div>
          <input
            name="whitePieceSet"
            type="radio"
            bind:group={$whitePieceSet}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>

  <div class="column is-one-third">
    <h2 class="is-size-2">Board Style (black)</h2>
    {#each boardOptions as option (option)}
      <label
        on:mouseenter={() => (boardStyleOverride = option)}
        on:focus={() => (boardStyleOverride = option)}
        on:mouseout={() => (boardStyleOverride = null)}
        on:blur={() => (boardStyleOverride = null)}
      >
        <div>
          <input
            name="blackBoardStyle"
            type="radio"
            bind:group={$blackBoardStyle}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>

  <div class="column is-one-third">
    <h2 class="is-size-2">Piece Set (black)</h2>
    {#each pieceSetOptions as option (option)}
      <label
        on:mouseenter={() => (pieceSetOverride = option)}
        on:focus={() => (pieceSetOverride = option)}
        on:mouseout={() => (pieceSetOverride = null)}
        on:blur={() => (pieceSetOverride = null)}
      >
        <div>
          <input
            name="blackPieceSet"
            type="radio"
            bind:group={$blackPieceSet}
            value={option}
          />
          {option}
        </div>
      </label>
    {/each}
  </div>
</div>
