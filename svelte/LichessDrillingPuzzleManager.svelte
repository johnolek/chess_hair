<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as RailsAPI from "./railsApi";
  import { drillModeTheme, drillModeLevels } from "./stores";

  let sessionResults = {};
  let targetRating = 1000;
  let ratingStep = 100;

  let minimumPuzzlesPerLevel = 5;
  let requiredSolveTime = 15000;

  let goBackThreshold = 0.5;
  let moveOnThreshold = 0.8;

  let rollingAverageNumber = 10;

  import { currentPuzzle, nextPuzzle } from "./stores.js";

  const dispatch = createEventDispatcher();

  async function fetchNextPuzzle() {
    const puzzleResult = await RailsAPI.fetchRandomLichessPuzzle({
      target_rating: targetRating,
      themes: [$drillModeTheme],
    });

    if (!puzzleResult) {
      return null;
    }

    return puzzleResult.puzzle;
  }

  async function getFirstPuzzles() {
    const puzzle = await fetchNextPuzzle();
    currentPuzzle.set(puzzle);
    void fetchNextPuzzle().then((puzzle) => {
      nextPuzzle.set(puzzle);
    });
  }

  export async function updateCurrentPuzzle() {
    if ($nextPuzzle) {
      currentPuzzle.set($nextPuzzle);
      void fetchNextPuzzle().then((puzzle) => {
        nextPuzzle.set(puzzle);
      });
    } else {
      const puzzle = await RailsAPI.fetchNextPuzzle();
      currentPuzzle.set(puzzle);
      void fetchNextPuzzle();
    }
  }

  export async function savePuzzleResult(result) {
    const meetsCriteria =
      !result.made_mistake && result.duration <= requiredSolveTime;
    result.themes.forEach((theme) => {
      void addResult(theme, meetsCriteria);
    });
  }

  async function addResult(theme, meetsCriteria) {
    if (!sessionResults[theme]) {
      sessionResults[theme] = [];
    }
    sessionResults[theme].push(meetsCriteria);
    // Every {minimumPuzzlesPerLevel} puzzles, check if we should move on, go back, etc

    let themeRating = $drillModeLevels[theme] || targetRating;
    let ratingChanged = false;
    if (sessionResults[theme].length % minimumPuzzlesPerLevel === 0) {
      const performanceRating = performance(theme);
      if (performanceRating <= goBackThreshold && themeRating >= targetRating) {
        themeRating = themeRating - ratingStep;
        ratingChanged = true;
      } else if (
        performanceRating >= moveOnThreshold &&
        themeRating <= targetRating
      ) {
        themeRating = themeRating + ratingStep;
        ratingChanged = true;
      }
    }

    if (ratingChanged) {
      await RailsAPI.updateDrillModeLevel(theme, themeRating);
      $drillModeLevels[theme] = themeRating;
      if (theme === $drillModeTheme) {
        targetRating = themeRating;
        sessionResults = {};
      }
    }
  }

  function performance(theme) {
    const results = sessionResults[theme] || [];
    if (results.length === 0) {
      return 0;
    }
    const consideredResults = results.slice(-rollingAverageNumber);
    const meetsCriteria = consideredResults.filter((result) => result).length;
    return meetsCriteria / consideredResults.length;
  }

  onMount(async () => {
    await RailsAPI.fetchDrillModeLevels().then((levels) => {
      levels.forEach((level) => {
        $drillModeLevels[level.theme] = level.rating;
      });
    });
    drillModeTheme.subscribe(async (theme) => {
      targetRating = $drillModeLevels[theme] || 1000;
      await getFirstPuzzles();
      dispatch("ready");
    });
  });
</script>
