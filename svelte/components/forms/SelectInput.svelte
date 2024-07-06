<script>
  export let label = "";
  export let options = []; // Array of {value, text}
  export let selected = "";
  export let additionalClasses = "";
</script>

<div class={`field ${additionalClasses}`}>
  <label class="label">
    {label}
    <div class="select">
      <select bind:value={selected}>
        {#each options as { value, text }}
          <option {value}>{text}</option>
        {/each}
      </select>
    </div>
  </label>
</div>
