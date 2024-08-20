<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as RailsAPI from "./railsApi";
  import { drillModeTheme, drillModeLevels } from "./stores";
  import { Util } from "src/util";

  let sessionResults = {};
  let themeCounterAbove = {};
  let themeCounterBelow = {};
  let targetRating = 1000;
  let ratingStep = 100;

  let minimumPuzzlesPerLevel = 3;
  let rollingAverageLength = 7;
  let requiredSolveTime = 30000;

  let goBackThreshold = 0.5;
  let moveOnThreshold = 0.8;

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
      void addResult(theme, meetsCriteria, targetRating);
    });
  }

  async function addResult(theme, meetsCriteria, targetRating) {
    if (!sessionResults[theme]) {
      sessionResults[theme] = [];
    }
    if (!themeCounterAbove[theme]) {
      themeCounterAbove[theme] = 0;
    }
    if (!themeCounterBelow[theme]) {
      themeCounterBelow[theme] = 0;
    }

    sessionResults[theme].push({ meetsCriteria, targetRating });

    let themeRating = $drillModeLevels[theme] || targetRating;

    if (targetRating >= themeRating) {
      themeCounterAbove[theme]++;
    }

    if (targetRating <= themeRating) {
      themeCounterBelow[theme]++;
    }

    if (themeCounterBelow[theme] >= minimumPuzzlesPerLevel) {
      const performanceBelow = performanceBelowTarget(theme, themeRating);
      if (performanceBelow <= goBackThreshold) {
        Util.info("Decreasing rating for " + theme);
        themeRating = Math.max(themeRating - ratingStep, 700);
        await RailsAPI.updateDrillModeLevel(theme, themeRating);
        $drillModeLevels[theme] = themeRating;
        themeCounterBelow[theme] = 0;
        if (theme === $drillModeTheme) {
          targetRating = themeRating;
          $nextPuzzle = await fetchNextPuzzle();
        }
      }
    }

    if (themeCounterAbove[theme] >= minimumPuzzlesPerLevel) {
      const performanceAbove = performanceAboveTarget(theme, themeRating);
      if (performanceAbove >= moveOnThreshold) {
        Util.info("Increasing rating for " + theme);
        themeRating = Math.min(themeRating + ratingStep, 3000);
        await RailsAPI.updateDrillModeLevel(theme, themeRating);
        $drillModeLevels[theme] = themeRating;
        themeCounterAbove[theme] = 0;
        if (theme === $drillModeTheme) {
          targetRating = themeRating;
          $nextPuzzle = await fetchNextPuzzle();
        }
      }
    }
    Util.info({ sessionResults });
  }

  function performanceAboveTarget(theme, themeRating) {
    const results = sessionResults[theme] || [];
    if (results.length === 0) {
      return 0;
    }
    const consideredResults = results
      .filter((result) => result.targetRating >= themeRating)
      .slice(-rollingAverageLength);
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
      .slice(-rollingAverageLength);
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
