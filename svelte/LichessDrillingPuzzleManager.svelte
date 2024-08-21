<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as RailsAPI from "./railsApi";
  import {
    drillModeTheme,
    drillModeLevels,
    drillModeGoBackThreshold,
    drillModeMinPuzzles,
    drillModeMoveOnThreshold,
    drillModeRollingAverage,
    drillModeTimeGoal,
    drillModePerformance,
  } from "./stores";
  import { Util } from "src/util";

  let sessionResults = {};
  let themeCounterAbove = {};
  let themeCounterBelow = {};
  let targetRating = 1000;
  let ratingStep = 100;

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
      !result.made_mistake && result.duration <= $drillModeTimeGoal;
    result.themes.forEach(async (theme) => {
      await addResult(theme, meetsCriteria, targetRating);
    });
  }

  async function addResult(theme, meetsCriteria, targetRatingOfSolvedPuzzle) {
    if (!sessionResults[theme]) {
      sessionResults[theme] = [];
    }
    if (!themeCounterAbove[theme]) {
      themeCounterAbove[theme] = 0;
    }
    if (!themeCounterBelow[theme]) {
      themeCounterBelow[theme] = 0;
    }

    sessionResults[theme].push({
      meetsCriteria,
      targetRating: targetRatingOfSolvedPuzzle,
    });

    let themeRating =
      $drillModeLevels[theme]?.rating || targetRatingOfSolvedPuzzle;

    if (targetRatingOfSolvedPuzzle >= themeRating) {
      themeCounterAbove[theme]++;
    }

    if (targetRatingOfSolvedPuzzle <= themeRating) {
      themeCounterBelow[theme]++;
    }

    if (theme === $drillModeTheme) {
      $drillModePerformance = performanceAboveTarget(theme, themeRating);
    }

    if (themeCounterBelow[theme] >= $drillModeMinPuzzles) {
      const performanceBelow = performanceBelowTarget(theme, themeRating);
      if (performanceBelow <= $drillModeGoBackThreshold) {
        Util.info("Decreasing rating for " + theme);
        themeRating = Math.max(themeRating - ratingStep, 700);
        await updateDrillModeLevel(theme, themeRating);
        themeCounterBelow[theme] = 0;
        if (theme === $drillModeTheme) {
          targetRating = themeRating;
          $nextPuzzle = await fetchNextPuzzle();
        }
      }
    }

    if (themeCounterAbove[theme] >= $drillModeMinPuzzles) {
      const performanceAbove = performanceAboveTarget(theme, themeRating);
      if (performanceAbove >= $drillModeMoveOnThreshold) {
        Util.info("Increasing rating for " + theme);
        themeRating = Math.min(themeRating + ratingStep, 3000);
        await updateDrillModeLevel(theme, themeRating);
        themeCounterAbove[theme] = 0;
        if (theme === $drillModeTheme) {
          targetRating = themeRating;
          $nextPuzzle = await fetchNextPuzzle();
        }
      }
    }
    Util.info({ sessionResults });
  }

  async function updateDrillModeLevel(theme, rating) {
    const response = await RailsAPI.updateDrillModeLevel(theme, rating);
    $drillModeLevels[theme] = response.updated_level;
  }

  function performanceAboveTarget(theme, themeRating) {
    const results = sessionResults[theme] || [];
    if (results.length === 0) {
      return 0;
    }
    const consideredResults = results
      .filter((result) => result.targetRating >= themeRating)
      .slice(-$drillModeRollingAverage);
    if (consideredResults.length === 0) {
      return 0;
    }
    const meetsCriteria = consideredResults.filter(
      (result) => result.meetsCriteria,
    ).length;
    return meetsCriteria / consideredResults.length;
  }

  function performanceBelowTarget(theme, themeRating) {
    const results = sessionResults[theme] || [];
    if (results.length === 0) {
      return 0;
    }
    const consideredResults = results
      .filter((result) => result.targetRating <= themeRating)
      .slice(-drillModeRollingAverage);
    if (consideredResults.length === 0) {
      return 0;
    }
    const meetsCriteria = consideredResults.filter(
      (result) => result.meetsCriteria,
    ).length;
    return meetsCriteria / consideredResults.length;
  }

  onMount(async () => {
    await RailsAPI.fetchDrillModeLevels().then((levels) => {
      levels.forEach((level) => {
        $drillModeLevels[level.theme] = level;
      });
    });
    drillModeTheme.subscribe(async (theme) => {
      targetRating = $drillModeLevels[theme].rating || 1000;
      await getFirstPuzzles();
      dispatch("ready");
    });
  });
</script>
