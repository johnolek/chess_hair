<script>
  import { onMount, onDestroy } from "svelte";

  let mountTime;
  let lastVisibleTime;
  export let elapsedTime = 0;
  let storedElapsedTime = 0;
  let animationFrameId;

  onMount(() => {
    mountTime = performance.now();
    lastVisibleTime = mountTime;

    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateElapsedTime();
  });

  onDestroy(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    cancelAnimationFrame(animationFrameId);
  });

  function handleVisibilityChange() {
    if (document.hidden) {
      storedElapsedTime = elapsedTime;
      cancelAnimationFrame(animationFrameId);
    } else {
      lastVisibleTime = performance.now();
      updateElapsedTime();
    }
  }

  function updateElapsedTime() {
    if (!document.hidden) {
      const elapsed = performance.now() - lastVisibleTime;
      elapsedTime = storedElapsedTime + elapsed;
      setTimeout(() => {
        requestAnimationFrame(updateElapsedTime);
      }, 200);
    }
  }
</script>
