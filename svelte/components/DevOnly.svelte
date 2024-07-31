<script>
  import { Util } from "src/util";

  const isDev = Util.isDev();
</script>

{#if isDev}
  <slot></slot>
{/if}
