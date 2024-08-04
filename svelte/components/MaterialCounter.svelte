<script>
  import { getMaterialCounts } from "./lib/chess_functions"; // Adjust the path as necessary
  import { writable } from "svelte/store";
  import { tweened } from "svelte/motion";

  let currentLoaded = false;
  let currentCounts = writable({});
  export let fen;

  const difference = tweened(0, { duration: 400 });

  $: {
    if (fen) {
      currentLoaded = true;
      const counts = getMaterialCounts(fen).materialCounts;
      $currentCounts = counts;
      difference.set(counts.difference);
    }
  }
</script>

{#if currentLoaded}
  <span
    class="tag"
    class:is-white={$difference > 0}
    class:is-black={$difference < 0}
    class:is-grey={$difference === 0}
  >
    {#if $difference !== 0}
      +{Math.abs($difference).toFixed(1)}
    {:else}
      ==
    {/if}
  </span>
{/if}
