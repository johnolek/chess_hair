<script>
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
    }
  }
</script>

<div
  class="spoiler"
  role="button"
  tabindex="0"
  style={minWidth ? `min-width: ${minWidth}px` : ""}
  on:click={toggleShown}
  on:keydown|preventDefault={handleKeydown}
>
  <div class="content" {title} class:hiddenContent={!isShown}>
    <slot></slot>
  </div>
</div>

<style>
  .spoiler {
    cursor: pointer;
    display: inline-block;
  }
  .content {
    border-radius: 3px;
  }
  .content:not(.hiddenContent) {
    transition:
      background-color 0.5s ease,
      color 0.5s ease;
  }
  .hiddenContent {
    background-color: var(--bulma-grey);
    color: transparent;
  }
</style>
