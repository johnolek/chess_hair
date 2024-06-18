<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { linear } from 'svelte/easing';

  const secondProgress = tweened(0, {
    duration: 1000,
    easing: linear,
  });

  export let max = 60;
  export let width;

  let updateInterval;

  const dispatch = createEventDispatcher();

  onMount(() =>{
    updateInterval = setInterval(() => {
      secondProgress.update((previous) => previous + 1);
      if ($secondProgress >= max) {
        clearInterval(updateInterval);
        dispatch('complete');
      }
    }, 1000);
  });

  onDestroy(() => clearInterval(updateInterval));
</script>

<progress
  class="progress is-success"
  value="{$secondProgress}"
  max={max}
  style="width: {width}px"
></progress>

<style>
  progress {
    width: 100%;
  }
</style>
