<script>
  import { slide } from "svelte/transition";
  import { writable } from "svelte/store";
  import { tweened } from "svelte/motion";
  import { linear } from "svelte/easing";

  export let defaultOpen = false;
  export let title = "";
  const isOpen = writable(defaultOpen);
  const rotation = tweened(0, {
    duration: 300,
    easing: linear,
  });

  function toggleOpen() {
    isOpen.update((n) => !n);
    rotation.set($isOpen ? 90 : 0);
  }

  function handleKeydown(event) {
    if (event.key === "Enter") {
      toggleOpen();
    }
  }
</script>

<div class="box" class:open={$isOpen}>
  <div
    class="toggle-button"
    role="button"
    tabindex="0"
    on:click={toggleOpen}
    on:keydown={handleKeydown}
  >
    <span class="mb-2">{title}</span>
    <span class="icon" style="transform: rotate({$rotation}deg);">▶</span>
  </div>
  {#if $isOpen}
    <div transition:slide>
      <slot></slot>
    </div>
  {/if}
</div>

<style>
  .toggle-button {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .toggle-button span {
    font-weight: bold; /* Make the title bold */
    font-size: 1.2em; /* Increase the title size */
    transition: color 0.3s ease; /* Smooth transition for color change */
  }

  /* Color change when open */
  .box.open .toggle-button span {
    color: var(--bulma-primary); /* Color when open */
  }

  /* Color change when closed */
  .box:not(.open) .toggle-button span {
    color: var(--bulma-primary-20); /* Color when closed */
  }

  .icon {
    margin-right: 8px;
    transition: transform 0.3s ease;
  }
</style>
