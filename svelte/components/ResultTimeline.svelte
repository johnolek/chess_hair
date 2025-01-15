<script>
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import { scrollIntoView } from "../actions/scrollIntoView";

  export let results = [];

  // Function to format the date
  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function sortedResults() {
    return results.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  }

  let scrollable;
  let mounted = false;

  function scrollToRight() {
    if (scrollable) {
      scrollable.scrollLeft = scrollable.scrollWidth;
    }
  }

  $: {
    if (results.length > 0) {
      scrollToRight();
    }
  }

  // Scroll to the right on mount
  onMount(() => {
    scrollToRight();
  });

  onMount(async () => {
    await tick();
    mounted = true;
  });
</script>

{#if results.length > 0}
  <div class="scrollable" bind:this={scrollable}>
    <div class="left-indicator"></div>
    <div class="timeline">
      {#each sortedResults() as result, index}
        <div in:fade={{ duration: mounted ? 300 : 0 }} use:scrollIntoView>
          <div
            class="timeline-item {result.made_mistake
              ? 'has-text-danger'
              : 'has-text-success'}">
            <span title={formatDate(result.created_at)}>
              {result.made_mistake ? "X" : "O"}
            </span>
          </div>
          {#if index < results.length - 1}
            <div class="timeline-separator">-</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .timeline {
    display: flex;
    align-items: center;
    user-select: none;
  }

  .timeline-separator {
    margin: 0 3px;
    display: inline-block;
  }

  .timeline-item {
    display: inline-block;
  }
</style>
