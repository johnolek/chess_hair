<script>
  import { onMount } from "svelte";
  import Puzzles from "./Puzzles.svelte";
  import DailyGames from "./DailyGames.svelte";
  import KnightMoves from "./KnightMoves.svelte";
  import NotationTrainer from "./NotationTrainer.svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import GlobalConfig from "./GlobalConfig.svelte";

  const idsToComponentMap = {
    puzzles: Puzzles,
    "daily-games": DailyGames,
    "knight-moves": KnightMoves,
    "notation-trainer": NotationTrainer,
    "theme-switcher": ThemeSwitcher,
    "global-config": GlobalConfig,
  };

  function mountComponentsById() {
    Object.entries(idsToComponentMap).forEach(([id, Component]) => {
      const element = document.getElementById(id);
      if (element) {
        new Component({ target: element });
      }
    });
  }

  onMount(() => {
    mountComponentsById();
  });
</script>
