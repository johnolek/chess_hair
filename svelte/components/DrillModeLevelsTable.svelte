<script>
  import { drillModeLevels, drillModeTheme } from "../stores";
</script>

<table class="table is-striped is-narrow is-fullwidth">
  <thead>
    <tr>
      <th>Theme</th>
      <th>Rating</th>
    </tr>
  </thead>
  <tbody>
    {#each Object.keys($drillModeLevels).sort() as theme}
      <tr class:is-selected={theme === $drillModeTheme}>
        <td>{theme}</td>
        <td>{$drillModeLevels[theme]}</td>
      </tr>
    {/each}
  </tbody>
</table>
