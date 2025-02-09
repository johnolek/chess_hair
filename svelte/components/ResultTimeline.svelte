<script>
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import { scrollIntoView } from "../actions/scrollIntoView";

  export let results = [];

  // Change from function to reactive statement
  $: sortedResults = [...results].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

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

  const SUCCESS_COLOR = "var(--bulma-success)";
  const ERROR_COLOR = "var(--bulma-danger)";

  function getResultColor(result) {
    return result.made_mistake ? ERROR_COLOR : SUCCESS_COLOR;
  }

  // Add function to calculate consecutive correct answers up to current index
  function getConsecutiveCorrect(results, currentIndex) {
    let count = 0;
    for (let i = currentIndex; i >= 0; i--) {
      if (!results[i].made_mistake) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

</script>

<div class="timeline-container">
  <span class="timeline-label">History:</span>
  <div class="scrollable mb-0" bind:this={scrollable}>
    <div class="timeline">
      {#each sortedResults as result, index}
        <div class="result-item">
          {#if index > 0 && !result.made_mistake && !sortedResults[index - 1].made_mistake}
            <svg 
              class="connecting-line-svg" 
              viewBox="-3 0 8 24" 
            >
              <line
                in:fade={{ duration: mounted ? 300 : 0 }}
                x1="-3"
                x2="8"
                y1="50%"
                y2="50%"
                stroke={SUCCESS_COLOR}
                stroke-width="3"
              />
            </svg>
          {/if}
          {#if result.made_mistake}
            <svg class="mistake-svg" viewBox="0 0 19 19">
              <line x1="1" x2="18" y1="1" y2="18" stroke={ERROR_COLOR} stroke-width="4" /> 
              <line x1="1" x2="18" y1="18" y2="1" stroke={ERROR_COLOR} stroke-width="4" /> 
              <title>{result.time_played_human}</title>
            </svg>
          {:else}
           <svg 
            class="circle-svg" 
            viewBox="0 0 24 24"
            use:scrollIntoView
          >
            <circle
              in:fade={{ duration: mounted ? 600 : 0 }}
              cx="50%"
              cy="50%"
              r="8"
              stroke={SUCCESS_COLOR}
              stroke-width="4"
              fill="transparent"
              class="circle"
            >
              <title>{result.time_played_human}</title>
            </circle>
          </svg>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .timeline-container {
    display: flex;
    align-items: center;
  }

  .timeline {
    display: flex;
    align-items: center;
    user-select: none;
    padding: 8px 0;
  }

  .timeline-label {
    font-weight: 500;
    display: inline-block;
  }

  .scrollable {
    overflow-x: auto;
    padding: 0 8px;
    position: relative;
    display: inline-block;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .circle-svg {
    width: 24px;
    height: 24px;
  }

  .mistake-svg {
    width: 19px;
    height: 19px;
    margin: 0 5px;
  }

  .connecting-line-svg {
    height: 24px;
    margin: 0 -3px;
  }

  .circle {
    transition: fill 0.3s ease;
  }

  .circle:hover, .mistake-svg:hover {
    filter: brightness(1.2);
    cursor: pointer;
  }
</style>
