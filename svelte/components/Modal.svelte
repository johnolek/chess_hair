<script>
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;
  const dispatch = createEventDispatcher();

  function closeModal() {
    isOpen = false;
    dispatch("close");
    window.removeEventListener("keydown", handleKeydown);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeModal();
    }
  }

  $: {
    if (isOpen) {
      window.addEventListener("keydown", handleKeydown);
    } else {
      window.removeEventListener("keydown", handleKeydown);
    }
  }
</script>

<div class="modal" class:is-active={isOpen} class:is-clipped={isOpen}>
  <div class="modal-background" aria-hidden="true" on:click={closeModal}></div>
  <div class="modal-content">
    <slot></slot>
  </div>
  <button class="modal-close is-large" aria-label="close" on:click={closeModal}
  ></button>
</div>

<style>
  .modal {
    display: none;
  }
  .modal.is-active {
    display: flex;
  }
</style>
