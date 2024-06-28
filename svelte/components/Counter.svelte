<script>
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let number;
  export let title;
</script>

<div class="box score-container">
  <div class="container has-text-centered">
    <h2 class="is-size-5">{title}</h2>
    <div class="number-container">
      {#key number}
        <div
          class="is-size-3 number"
          in:fly={{ y: 15, duration: 500, easing: cubicOut }}
        >
          {number}
        </div>
      {/key}
    </div>
  </div>
</div>
