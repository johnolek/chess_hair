<script>
  import { onDestroy, onMount } from "svelte";

  export let width;
  export let height;
  export let minSize = 0;
  let parentNode;

  let isResizing = false;
  let resized = false;
  let startX, startY, startWidth, startHeight;

  function startResizing(event) {
    isResizing = true;
    resized = true;
    startX = event.touches ? event.touches[0].clientX : event.clientX;
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    startWidth = width;
    startHeight = height;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", stopResizing);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", stopResizing);
  }

  function onMove(event) {
    if (!isResizing) return;
    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dx = clientX - startX;
    const dy = clientY - startY;
    let newWidth = Math.max(startWidth + dx, minSize);
    let newHeight = Math.max(startHeight + dy, minSize);
    const parentWidth = parentNode.clientWidth;
    const parentHeight = parentNode.clientHeight;
    if (newWidth > parentWidth) newWidth = parentWidth;
    if (newHeight > parentHeight) newHeight = parentHeight;
    width = newWidth;
    height = newHeight;
  }

  function stopResizing() {
    isResizing = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", stopResizing);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", stopResizing);
  }

  function resizeCallback() {
    const parentWidth = parentNode.clientWidth;
    const parentHeight = parentNode.clientHeight;
    if (width > parentWidth) width = parentWidth;
    if (height > parentHeight) height = parentHeight;
    if (!resized) {
      width = parentWidth;
      height = parentHeight;
    }
  }

  onMount(() => {
    parentNode = document.querySelector(".resizable-container").parentNode;
    width = parentNode.clientWidth;
    height = parentNode.clientHeight;

    window.addEventListener("resize", resizeCallback);
  });

  onDestroy(() => {
    window.removeEventListener("resize", resizeCallback);
  });
</script>

<div
  class="resizable-container"
  class:is-resizing={isResizing}
  style="width: {width}px; height: {height}px;"
>
  <slot></slot>
  <div
    class="resizer"
    on:mousedown={startResizing}
    on:touchstart={startResizing}
    role="button"
    tabindex="0"
  ></div>
</div>

<style>
  .resizer {
    position: absolute;
    width: 10px;
    height: 10px;
    bottom: -5px;
    right: -5px;
    cursor: nwse-resize;
    background-color: transparent;
    touch-action: none;
    user-select: none;
  }

  .resizable-container {
    display: inline-block;
    position: relative;
    overflow: hidden;
    max-width: 100%;
    max-height: 100%;
    box-sizing: border-box;
  }

  .resizer:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .is-resizing {
    outline: 1px solid red;
  }
</style>
