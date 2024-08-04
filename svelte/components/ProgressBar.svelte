<script>
  import { tweened } from "svelte/motion";
  import { quadInOut } from "svelte/easing";

  export let max;
  export let current;
  export let className = "is-success";

  const tweenedProgress = tweened(current, {
    duration: 1000,
    easing: quadInOut,
  });

  $: tweenedProgress.set(current);
</script>

<progress class="progress {className}" value={$tweenedProgress} {max}
></progress>
