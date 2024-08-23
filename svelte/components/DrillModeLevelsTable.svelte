<script>
  import { drillModeLevels, drillModeTheme } from "../stores";
  import { flip } from "svelte/animate";

  let sortingFunction = undefined;

  function sortByRatingDescending(a, b) {
    return b.rating - a.rating;
  }

  function sortByRatingAscending(a, b) {
    return a.rating - b.rating;
  }

  function sortByThemeAscending(a, b) {
    return a.theme.localeCompare(b.theme);
  }

  function sortByThemeDescending(a, b) {
    return b.theme.localeCompare(a.theme);
  }

  function sortByLastUpdatedDescending(a, b) {
    const dateA = new Date(a.updated_at);
    const dateB = new Date(b.updated_at);
    return dateB - dateA;
  }

  $: levelsCount = Object.keys($drillModeLevels).length;
</script>

<table class="table is-striped is-narrow is-fullwidth">
  <thead>
    <tr>
      <th>Theme</th>
      <th>Rating</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#if levelsCount > 0}
      {#each Object.values($drillModeLevels).sort(sortByLastUpdatedDescending) as level (level.theme)}
        <tr animate:flip class:is-selected={level.theme === $drillModeTheme}>
          <td>{level.theme}</td>
          <td>{level.rating}</td>
          <td>
            {#if level.theme !== $drillModeTheme}
              <button
                class="button is-small is-primary"
                on:click={() => ($drillModeTheme = level.theme)}>
                ✔
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    {/if}✔
  </tbody>
</table>
