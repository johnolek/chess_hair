<script>
  import { boardOptions, pieceSetOptions } from "src/board/options";
  import { boardStyle, pieceSet } from './stores'
</script>

<h2 class="is-size-2">Piece Set</h2>
{#each pieceSetOptions as option (option)}
  <label>
    <input name="pieceSet" type="radio" bind:group={$pieceSet} value={option}>
    {option}
  </label>
  <br/>
{/each}

<h2 class="is-size-2">Board Style</h2>
{#each boardOptions as option(option)}
  <label>
    <input name="boardStyle" type="radio" bind:group={$boardStyle} value={option}>
    {option}
  </label>
  <br/>
{/each}
