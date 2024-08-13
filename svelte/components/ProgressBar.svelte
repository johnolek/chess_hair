<script>
  import { tweened } from "svelte/motion";
  import { quadInOut } from "svelte/easing";

  export let current;
  export let max = 100;
  export let automdaticColor = true;
  export let className = "is-success";

  const tweenedProgress = tweened(current, {
    duration: 2000,
    easing: quadInOut,
  });

  $: tweenedProgress.set(current);

  $: {
    if (automdaticColor) {
      const percentComplete = $tweenedProgress / max;
      if (percentComplete < 0.15) {
        className = "is-danger";
      } else if (percentComplete < 0.5) {
        className = "is-warning";
      } else {
        className = "is-success";
      }
    }
  }
</script>

<progress class="progress {className}" value={$tweenedProgress} {max}
></progress>
