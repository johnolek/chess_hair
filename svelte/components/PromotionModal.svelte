<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";

  export let isOpen = false;
  export let color = "white";
  const dispatch = createEventDispatcher();
  let modalContent;

  function selectPiece(piece) {
    dispatch("select", { piece });
    isOpen = false;
  }

  function handleClickOutside(event) {
    if (isOpen && !event.target.closest(".modal-content")) {
      close();
    }
  }

  function handleKeyDown(event) {
    if (!isOpen) {
      return;
    }
    if (event.key === "Escape") {
      close();
    } else if (event.key === "Tab") {
      handleTab(event);
    } else if (event.key === "Enter") {
      handleEnter(event);
    }
  }

  function close() {
    dispatch("close");
    isOpen = false;
  }

  function handleTab(event) {
    const focusableElements = modalContent.querySelectorAll("button");
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  }

  function handleEnter(event) {
    const focusedElement = document.activeElement;
    if (focusedElement.tagName === "BUTTON") {
      event.preventDefault();
      focusedElement.click();
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  });

  $: if (isOpen && modalContent) {
    modalContent.querySelector("button").focus();
  }
</script>

{#if isOpen}
  <div class="modal">
    <div class="modal-content" bind:this={modalContent}>
      <div class="piece-options is2d">
        <button on:click={() => selectPiece("q")}>
          <piece class="{color} queen" />
        </button>
        <button on:click={() => selectPiece("n")}>
          <piece class="{color} knight" />
        </button>
        <button on:click={() => selectPiece("r")}>
          <piece class="{color} rook" />
        </button>
        <button on:click={() => selectPiece("b")}>
          <piece class="{color} bishop" />
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10; /* Ensure it is above the chessboard */
    backdrop-filter: blur(3px);
  }

  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
    display: flex;
    justify-content: space-around;
    width: 95%;
  }

  .piece-options {
    display: flex;
    justify-content: space-around;
    width: 100%;
  }

  .piece-options button {
    margin: 5px;
    padding: 0;
    width: 25%; /* 25% of the modal content width */
    aspect-ratio: 1; /* Maintain square aspect ratio */
  }

  button {
    touch-action: manipulation;
  }

  piece {
    display: inline-block;
    position: relative;
    width: 100%;
    height: 100%;
    touch-action: manipulation;
  }
</style>
