<script>
  import { tweened } from "svelte/motion";
  import { quadInOut } from "svelte/easing";

  export let current;
  export let max = 100;
  export let automdaticColor = true;
  export let className = "is-success";
  export let dangerThreshold = 0.15;
  export let successThreshold = 0.5;

  const tweenedProgress = tweened(current, {
    duration: 2000,
    easing: quadInOut,
  });

  $: tweenedProgress.set(current);

  $: {
    if (automdaticColor) {
      const percentComplete = $tweenedProgress / max;
      if (percentComplete < dangerThreshold) {
        className = "is-danger";
      } else if (percentComplete < successThreshold) {
        className = "is-warning";
      } else {
        className = "is-success";
      }
    }
  }
</script>

<progress class="progress {className}" value={$tweenedProgress} {max}>
</progress>
