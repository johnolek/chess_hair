<script>
  export let showSlider = false;
  export let label = "";
  export let min = null;
  export let max = null;
  export let step = null;
  export let value = min; // Default value is min
  export let additionalClasses = "";
  export let isLoading = false;
  export let onChange = () => {};

  // Reactive statement to enforce min and max
  $: if (value < min) value = min;
  $: if (value > max) value = max;

  function handleChange(event) {
    value = +event.target.value; // + to convert text input to number
    onChange(value);
  }
</script>

<div class={`field ${additionalClasses}`}>
  <label class="label">
    {label}
    <input
      class="input"
      class:is-loading={isLoading}
      type="number"
      disabled={isLoading}
      {min}
      {max}
      {step}
      {value}
      on:change={handleChange}
    />
    {#if showSlider}
      <input
        class="slider is-fullwidth"
        {min}
        {max}
        {step}
        {value}
        on:change={handleChange}
        type="range"
      />
    {/if}
  </label>
</div>
