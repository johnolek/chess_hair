<script>
  export let label = "";
  export let checked = false;
  export let additionalClasses = "";
</script>

<div class={`field ${additionalClasses}`}>
  <label class="checkbox">
    <input type="checkbox" bind:checked />
    {label}
  </label>
</div>
