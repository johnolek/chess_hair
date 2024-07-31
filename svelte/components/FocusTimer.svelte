<script>
  import { onMount, onDestroy } from "svelte";
  import { Util } from "src/util";

  let lastVisibleTime;
  export let elapsedTime = 0;
  let storedElapsedTime = 0;
  let elapsedSinceLastVisible = 0;

  let interval;

  onMount(() => {
    lastVisibleTime = Util.currentMicrotime();
    interval = setInterval(() => {
      elapsedSinceLastVisible = Util.currentMicrotime() - lastVisibleTime;
      elapsedTime = storedElapsedTime + elapsedSinceLastVisible;
    }, 100);

    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onDestroy(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearInterval(interval);
  });

  function handleVisibilityChange() {
    if (document.hidden) {
      storedElapsedTime = storedElapsedTime + elapsedSinceLastVisible;
    } else {
      lastVisibleTime = Util.currentMicrotime();
      elapsedSinceLastVisible = 0;
    }
  }
</script>
