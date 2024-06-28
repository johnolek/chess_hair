<script>
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { tweened } from "svelte/motion";
  import { linear } from "svelte/easing";

  const secondProgress = tweened(0, {
    duration: 1000,
    easing: linear,
  });

  export let max = 60;
  export let width;

  let timeRemaining;

  const dispatch = createEventDispatcher();

  $: {
    timeRemaining = max - $secondProgress;
  }

  $: {
    if (timeRemaining <= 0) {
      dispatch("complete");
      clearInterval(updateInterval);
    }
  }

  let updateInterval;

  onMount(() => {
    secondProgress.update((previous) => previous + 1);
    updateInterval = setInterval(() => {
      secondProgress.update((previous) => previous + 1);
    }, 1000);
  });

  onDestroy(() => clearInterval(updateInterval));
</script>

<div class="div" style="width: {width}px">
  <progress class="progress is-success mb-0" value={$secondProgress} {max}
  ></progress>
  <div class="has-text-centered is-size-3">
    {timeRemaining.toFixed(2)}
  </div>
</div>

<style>
  progress {
    position: relative;
    width: 100%;
  }
</style>
