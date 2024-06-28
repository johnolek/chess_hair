<script>
  import { fade } from "svelte/transition";
  export let duration = 1000;
  export let key;
  let showContent = true;

  $: {
    if (key) {
      showContent = true;
    }
  }

  $: {
    if (showContent) {
      setTimeout(() => {
        showContent = false;
      }, duration);
    }
  }
</script>

{#if showContent}
  <div transition:fade={{ duration: 100 }}>
    <slot></slot>
  </div>
{/if}
