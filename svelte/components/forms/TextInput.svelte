<script>
  export let label = "";
  export let placeholder = "";
  export let value = "";
  export let additionalClasses = "";
</script>

<div class={`field ${additionalClasses}`}>
  <label class="label">
    {label}
    <input class="input" type="text" {placeholder} bind:value />
  </label>
</div>
