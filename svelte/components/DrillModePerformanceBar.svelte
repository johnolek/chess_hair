<script>
  import ProgressBar from "./ProgressBar.svelte";
  import {
    drillModeMoveOnThreshold,
    drillModeGoBackThreshold,
    drillModePerformance,
  } from "../stores";
</script>

<ProgressBar
  max={1}
  current={$drillModePerformance}
  dangerThreshold={$drillModeGoBackThreshold}
  successThreshold={$drillModeMoveOnThreshold} />
