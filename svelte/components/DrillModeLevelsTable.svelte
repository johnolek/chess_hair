<script>
  import Fa from "svelte-fa";
  import { faBan, faEye, faPlus } from "@fortawesome/free-solid-svg-icons";
  import {
    drillModeLevels,
    drillModeTheme,
    drillModeAutoSelectWorst,
    drillModeAvoidThemes,
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

  function excludeThemeFromDrillMode(theme) {
    drillModeAvoidThemes.update((themes) => {
      if (!themes.includes(theme)) {
        themes.push(theme);
      }
      return themes;
    });
  }

  function includeThemeInDrillMode(theme) {
    drillModeAvoidThemes.update((themes) => {
      return themes.filter((t) => t !== theme);
    });
  }

  function isThemeExcludedFromDrillMode(theme) {
    return $drillModeAvoidThemes.includes(theme);
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
                  includeThemeInDrillMode(level.theme);
                  $drillModeAutoSelectWorst = false;
                }}>
                <Fa icon={faEye} />
              </button>
            {/if}
            {#if $drillModeAutoSelectWorst}
              {#if !$drillModeAvoidThemes.includes(level.theme)}
                <button
                  class="button is-small is-danger"
                  title="Exclude this theme"
                  on:click={() => excludeThemeFromDrillMode(level.theme)}>
                  <Fa icon={faBan} />
                </button>
              {:else}
                <button
                  class="button is-small is-success"
                  title="Include this theme"
                  on:click={() => includeThemeInDrillMode(level.theme)}>
                  <Fa icon={faPlus} />
                </button>
              {/if}
            {/if}
          </td>
        </tr>
      {/each}
    {/if}
  </tbody>
</table>
