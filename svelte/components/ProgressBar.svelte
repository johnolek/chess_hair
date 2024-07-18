<script>
  import { tweened } from "svelte/motion";
  import { linear } from "svelte/easing";

  export let max;
  export let current;
  export let className = "is-success";

  const tweenedProgress = tweened(current, {
    duration: 1000,
    easing: linear,
  });

  $: tweenedProgress.set(current);
</script>

<div class="div">
  <progress class="progress {className}" value={$tweenedProgress} {max}
  ></progress>
</div>
