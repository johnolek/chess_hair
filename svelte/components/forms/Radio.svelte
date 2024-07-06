<script>
  export let groupName = "";
  export let options = []; // Array of {value, label}
  export let selectedValue = "";
  export let additionalClasses = "";
</script>

<div class={`field ${additionalClasses}`}>
  <label class="label">{groupName}</label>
  {#each options as { value, label }}
    <label class="radio">
      <input type="radio" bind:group={selectedValue} {value} />
      {label}
    </label>
  {/each}
</div>
