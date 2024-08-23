<script>
  import Fa from "svelte-fa";
  import { faEye } from "@fortawesome/free-solid-svg-icons";
  import {
    drillModeLevels,
    drillModeTheme,
    drillModeAutoSelectWorst,
  } from "../stores";
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

<div class="block">
  <button
    class="button is-primary"
    on:click={() => {
      $drillModeAutoSelectWorst = !$drillModeAutoSelectWorst;
    }}>
    {#if $drillModeAutoSelectWorst}
      Disable
    {:else}
      Enable
    {/if}
    Auto Select Worst
  </button>
</div>

<table class="table is-striped is-narrow">
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
        <tr
          animate:flip={{ duration: 500 }}
          class:is-selected={level.theme === $drillModeTheme}>
          <td>{level.theme}</td>
          <td>{level.rating}</td>
          <td>
            {#if level.theme !== $drillModeTheme}
              <button
                class="button is-small is-primary"
                title="Focus on this theme"
                on:click={() => {
                  $drillModeTheme = level.theme;
                  $drillModeAutoSelectWorst = false;
                }}>
                <Fa icon={faEye} />
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    {/if}
  </tbody>
</table>
