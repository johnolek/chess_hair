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

  const CIRCLE_RADIUS = 10;
  const CIRCLE_SPACING = 30;
  
  // Define colors using CSS variables
  const SUCCESS_COLOR = "var(--bulma-success)";
  const ERROR_COLOR = "var(--bulma-danger)";

  function getResultColor(result) {
    return result.made_mistake ? ERROR_COLOR : SUCCESS_COLOR;
  }
</script>

<div class="timeline-container">
<span class="timeline-label">History:</span>
  <div class="scrollable mb-0" bind:this={scrollable}>
    <div class="left-indicator"></div>
    <div class="timeline">
      <svg 
        class="timeline-svg" 
        height={CIRCLE_RADIUS * 2 + 4} 
        width={results.length * CIRCLE_SPACING}>
        <defs>
          {#each sortedResults as result, index}
            {#if index < results.length - 1}
              <linearGradient id="gradient-{index}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color={getResultColor(result)} />
                <stop offset="100%" stop-color={getResultColor(sortedResults[index + 1])} />
              </linearGradient>
            {/if}
          {/each}
        </defs>
        {#each sortedResults as result, index}
          {#if index < results.length - 1 && !result.made_mistake}
            <rect 
              in:fade={{ duration: mounted ? 300 : 0 }} 
              x={CIRCLE_SPACING * index + CIRCLE_RADIUS + (CIRCLE_RADIUS - 3.5)}
              y={CIRCLE_RADIUS + 2 - 2}
              width={CIRCLE_SPACING - ((CIRCLE_RADIUS - 3.5) * 2)}
              height="4"
              fill={`url(#gradient-${index})`}
              rx="2"
              ry="2"
            />
          {/if}
        {/each}
        {#each sortedResults as result, index}
          <g 
            in:fade={{ duration: mounted ? 600 : 0 }} 
            use:scrollIntoView>
            <circle
              cx={CIRCLE_SPACING * index + CIRCLE_RADIUS}
              cy={CIRCLE_RADIUS + 2}
              r={CIRCLE_RADIUS - 2}
              stroke={getResultColor(result)}
              stroke-width="4"
              fill="transparent"
              class="timeline-circle"
            >
              <title>{formatDate(result.created_at)}</title>
            </circle>
          </g>
        {/each}
      </svg>
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
    padding: 0 16px;
    position: relative;
    display: inline-block;
  }

  .timeline-svg {
    overflow: visible;
  }

  :global(.timeline-circle) {
    transition: fill 0.3s ease;
  }

  :global(.timeline-circle:hover) {
    filter: brightness(1.1);
    cursor: pointer;
  }
</style>
