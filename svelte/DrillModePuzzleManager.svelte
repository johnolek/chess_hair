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
    drillModeAutoSelectWorst,
    drillModeAvoidThemes,
    drillModeIncreaseStep,
    drillModeDecreaseStep,
  } from "./stores";
  import { Util } from "src/util";

  let sessionResults = {};
  let themeCounterAbove = {};
  let themeCounterBelow = {};

  import { currentPuzzle, nextPuzzle } from "./stores.js";

  const dispatch = createEventDispatcher();

  async function fetchNextPuzzle() {
    if ($drillModeAutoSelectWorst) {
      chooseWorstTheme();
    }
    const targetRating = $drillModeLevels[$drillModeTheme].rating || 1000;
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
    } else {
      const puzzle = await fetchNextPuzzle();
      currentPuzzle.set(puzzle);
    }
    void fetchNextPuzzle().then((puzzle) => {
      nextPuzzle.set(puzzle);
    });
  }

  export async function savePuzzleResult(result) {
    void RailsAPI.savePuzzleResult(result);
    const meetsCriteria =
      !result.made_mistake && result.duration <= $drillModeTimeGoal;
    await Promise.all(
      result.themes.map(async (theme) => {
        await addResult(theme, meetsCriteria, result.rating);
      }),
    );
  }

  function initializeThemeData(theme) {
    if (!sessionResults[theme]) {
      sessionResults[theme] = [];
    }
    if (!themeCounterAbove[theme]) {
      themeCounterAbove[theme] = 0;
    }
    if (!themeCounterBelow[theme]) {
      themeCounterBelow[theme] = 0;
    }
  }

  function updateSessionResults(
    theme,
    meetsCriteria,
    targetRatingOfSolvedPuzzle,
  ) {
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

    return themeRating;
  }

  async function checkAndUpdateThemeRating(theme, themeRating) {
    if (themeCounterBelow[theme] >= $drillModeMinPuzzles) {
      const performanceBelow = performanceBelowTarget(theme, themeRating);
      if (performanceBelow <= $drillModeGoBackThreshold) {
        Util.info("Decreasing rating for " + theme);
        themeRating = Math.max(themeRating - $drillModeDecreaseStep, 700);
        await updateDrillModeLevel(theme, themeRating);
        resetThemeCounters(theme);
      }
    }

    if (themeCounterAbove[theme] >= $drillModeMinPuzzles) {
      const performanceAbove = performanceAboveTarget(theme, themeRating);
      if (performanceAbove >= $drillModeMoveOnThreshold) {
        Util.info("Increasing rating for " + theme);
        themeRating = Math.min(themeRating + $drillModeIncreaseStep, 3000);
        await updateDrillModeLevel(theme, themeRating);
        resetThemeCounters(theme);
      }
    }
  }

  function resetThemeCounters(theme) {
    themeCounterBelow[theme] = 0;
    themeCounterAbove[theme] = 0;
  }

  async function addResult(theme, meetsCriteria, targetRatingOfSolvedPuzzle) {
    initializeThemeData(theme);

    let themeRating = updateSessionResults(
      theme,
      meetsCriteria,
      targetRatingOfSolvedPuzzle,
    );

    if (theme === $drillModeTheme) {
      $drillModePerformance = performanceAboveTarget(theme, themeRating);
    }

    Util.info(
      `${theme} above target: ${performanceAboveTarget(theme, themeRating)}`,
    );
    Util.info(
      `${theme} below target: ${performanceBelowTarget(theme, themeRating)}`,
    );

    await checkAndUpdateThemeRating(theme, themeRating);

    Util.info({ sessionResults });
  }

  async function updateDrillModeLevel(theme, rating) {
    const response = await RailsAPI.updateDrillModeLevel(theme, rating);
    $drillModeLevels[theme] = response.updated_level;
  }

  function chooseWorstTheme() {
    const levels = Object.values($drillModeLevels)
      .filter((level) => {
        return !$drillModeAvoidThemes.includes(level.theme);
      })
      .sort((a, b) => a.rating - b.rating);
    $drillModeTheme = Util.getRandomElement(levels.slice(0, 2)).theme;
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
    if ($drillModeAutoSelectWorst) {
      chooseWorstTheme();
    }
    await getFirstPuzzles();
    dispatch("ready");
  });
</script>
