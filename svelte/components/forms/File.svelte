<script>
  export let label = "";
  export let additionalClasses = "";
  let files = [];

  // Svelte action for handling file selection
  function handleFiles(node) {
    node.addEventListener("change", () => {
      files = [...node.files];
      // Handle file upload or manipulation here
    });

    return {
      destroy() {
        node.removeEventListener("change", handleFiles);
      },
    };
  }
</script>

<div class={`file has-name ${additionalClasses}`}>
  <label class="file-label">
    <input
      class="file-input"
      type="file"
      name="resume"
      use:handleFiles
      multiple
    />
    <span class="file-cta">
      <span class="file-icon">📤</span>
      <span class="file-label">
        {label}
      </span>
    </span>
  </label>
</div>
