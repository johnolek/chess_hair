<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as RailsAPI from "./railsApi";
  import { persisted } from "svelte-persisted-store";
  import { Util } from "src/util";
  import { drillModeTheme, drillModeLevels } from "./stores";

  let lastResults = persisted("lastResults", []);

  let baseRating = 1000;
  let ratingRange = 50;
  let ratingStep = 100;

  let minimumPuzzlesPerLevel = 3;
  let requiredSolveTime = 30000;
  let requiredAccuracy = 0.8;

  let losingAccuracy = 0.4;

  let puzzleCounter = 0;
  let rollingAverageNumber = 10;

  $: minRating = baseRating - ratingRange;
  $: maxRating = baseRating + ratingRange;

  import { currentPuzzle, nextPuzzle } from "./stores.js";
  import { updateDrillModeLevel } from "./railsApi";

  const dispatch = createEventDispatcher();

  async function fetchNextPuzzle() {
    const puzzle = await RailsAPI.fetchRandomLichessPuzzle({
      min_rating: minRating,
      max_rating: maxRating,
      themes: [$drillModeTheme],
    });

    if (!puzzle) {
      return;
    }

    return puzzle;
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
    puzzleCounter = puzzleCounter + 1;
    lastResults.update((results) => {
      results.push(result);
      return results;
    });
    maybeChangeLevel();
  }

  function maybeChangeLevel() {
    if (puzzleCounter < minimumPuzzlesPerLevel) {
      return;
    }

    if (accuracy() < losingAccuracy) {
      baseRating = baseRating - ratingStep;
      $drillModeLevels[$drillModeTheme] = baseRating;
      puzzleCounter = 0;
      Util.info(
        `Reduced base rating to ${baseRating} because accuracy of ${accuracy()} is lower than ${losingAccuracy}`,
      );
      return;
    }

    if (averageSolveTime() > requiredSolveTime) {
      Util.info(
        `${averageSolveTime()} is higher than ${requiredSolveTime}, not possible to increase level`,
      );
      return;
    }

    if (accuracy() > requiredAccuracy) {
      baseRating = baseRating + ratingStep;
      $drillModeLevels[$drillModeTheme] = baseRating;
      puzzleCounter = 0;
      Util.info(
        `Increased base rating to ${baseRating} because accuracy of ${accuracy()} is higher than ${requiredAccuracy}`,
      );
      return;
    }
  }

  function accuracy() {
    const relevantResults = $lastResults.slice(-rollingAverageNumber);
    const correctResults = relevantResults.filter(
      (result) => !result.made_mistake,
    );
    return correctResults.length / relevantResults.length;
  }

  function averageSolveTime() {
    const relevantResults = $lastResults
      .filter((result) => !result.made_mistake)
      .slice(-rollingAverageNumber);
    return (
      relevantResults.reduce((acc, result) => acc + result.duration, 0) /
      relevantResults.length
    );
  }

  // Initialize puzzles on mount
  onMount(async () => {
    drillModeTheme.subscribe(async (theme) => {
      if (!$drillModeLevels[theme]) {
        $drillModeLevels[theme] = 1000;
        $lastResults = [];
      }
      baseRating = $drillModeLevels[theme];
      await getFirstPuzzles();
      dispatch("ready");
    });
  });
</script>
