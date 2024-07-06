<script>
  export let action = "";
  export let method = "get";
</script>

<form {action} {method} class="form">
  <slot></slot>
</form>
