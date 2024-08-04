<script>
  import { slide, fly } from "svelte/transition";
  import { bounceOut, expoIn, expoOut, quartIn } from "svelte/easing";
  export let isShown = false;
  export let minWidth;
  export let title = "";

  function toggleShown() {
    isShown = !isShown;
  }

  function handleKeydown(event) {
    // Check if the key is Enter or Space
    if (event.key === "Enter" || event.key === " ") {
      toggleShown();
      event.preventDefault();
    }
  }
</script>

<div
  class="spoiler"
  role="button"
  tabindex="0"
  style={minWidth ? `min-width: ${minWidth}px` : ""}
  on:click={toggleShown}
  on:keydown={handleKeydown}
>
  <div class="content" {title}>
    <slot></slot>
    {#if !isShown}
      <div
        in:fly={{
          y: "-100%",
          duration: 1000,
          opacity: 1,
          easing: bounceOut,
        }}
        out:fly={{
          y: "-100%",
          duration: 1000,
          opacity: 1,
          easing: quartIn,
        }}
        class="overlay"
      >
        <span class="overlay-text">{title}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .spoiler {
    cursor: pointer;
    display: inline-block;
    position: relative;
  }
  .content,
  .overlay {
    border-radius: 3px;
    padding: 2px 3px;
    position: relative;
  }
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bulma-grey);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    transition: opacity 0.5s ease;
    overflow: hidden;
  }
  .overlay-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    transform: scale(1);
    transform-origin: center;
  }
</style>
