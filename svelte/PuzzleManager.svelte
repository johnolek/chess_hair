<script>
  import { onDestroy, onMount, createEventDispatcher } from "svelte";
  import { writable } from "svelte/store";
  import * as RailsAPI from "./railsApi";
  import { Util } from "src/util";
  import { initSettings, getSetting } from "./settingsManager.js";
  import { settings } from "./stores.js";

  // State stores
  import {
    puzzleHistory,
    randomCompletedPuzzle,
    activePuzzles,
    allPuzzles,
    allFilteredPuzzles,
    eligibleActivePuzzles,
    eligibleOtherPuzzles,
    eligibleFilteredPuzzles,
    currentPuzzle,
    totalIncorrectPuzzlesCount,
    totalFilteredPuzzlesCount,
    completedFilteredPuzzlesCount,
  } from "./stores.js";

  const dispatch = createEventDispatcher();
  const puzzlesToExcludeBecauseOfPuzzleCountBetween = writable([]);

  $: {
    if ($puzzleHistory.length > 0 && minimumPuzzlesBetweenReviews > 0) {
      puzzlesToExcludeBecauseOfPuzzleCountBetween.set(
        $puzzleHistory.slice(0, minimumPuzzlesBetweenReviews),
      );
    } else {
      puzzlesToExcludeBecauseOfPuzzleCountBetween.set([]);
    }
  }

  activePuzzles.subscribe((puzzles) => {
    eligibleActivePuzzles.set(puzzles.filter(eligiblePuzzlesFilter));
  });

  allPuzzles.subscribe((puzzles) => {
    eligibleActivePuzzles.set(puzzles.filter(eligiblePuzzlesFilter));
    eligibleOtherPuzzles.set(puzzles.filter((p) => !p.active));
  });

  allFilteredPuzzles.subscribe((puzzles) => {
    eligibleFilteredPuzzles.set(puzzles.filter(eligiblePuzzlesFilter));
  });

  // Fetch and update functions
  async function updateActivePuzzles() {
    const response = await RailsAPI.fetchActivePuzzles();
    puzzleHistory.set(response.most_recent_seen);
    activePuzzles.set(response.puzzles);
    totalIncorrectPuzzlesCount.set(response.total_incorrect_puzzles_count);
    totalFilteredPuzzlesCount.set(response.total_filtered_puzzles_count);
    completedFilteredPuzzlesCount.set(
      response.completed_filtered_puzzles_count,
    );
  }

  async function fetchAllPuzzles() {
    const puzzles = await RailsAPI.fetchAllPuzzles();
    allPuzzles.set(puzzles);
  }

  async function fetchAllFilteredPuzzles() {
    const puzzles = await RailsAPI.fetchFilteredPuzzles();
    allFilteredPuzzles.set(puzzles);
  }

  async function updateRandomCompletedPuzzle(excludedPuzzleId = null) {
    const puzzle = await RailsAPI.fetchRandomCompletedPuzzle(excludedPuzzleId);
    randomCompletedPuzzle.set(puzzle);
  }

  function eligiblePuzzlesFilter(puzzle) {
    const currentTimestamp = Util.getCurrentUnixTime();
    if (
      $puzzlesToExcludeBecauseOfPuzzleCountBetween.includes(puzzle.puzzle_id)
    ) {
      Util.debug(`Excluding ${puzzle.puzzle_id} since it was recently seen`);
      return false;
    }

    if (!puzzle.last_played_timestamp) {
      return true;
    }

    // The -10 is some wiggle room in to account for server/client time differences
    return (
      puzzle.last_played_timestamp + minimumTimeBetweenReviews - 10 <
      currentTimestamp
    );
  }

  function updateCurrentPuzzle() {
    if (
      $randomCompletedPuzzle &&
      (Math.random() < oddsOfRandomCompleted ||
        $eligibleActivePuzzles.length < 1)
    ) {
      void updateRandomCompletedPuzzle($randomCompletedPuzzle.puzzle_id);
      return $randomCompletedPuzzle;
    }

    if ($eligibleActivePuzzles.length >= 1) {
      currentPuzzle.set(Util.getRandomElement($eligibleActivePuzzles));
      return;
    } else if ($eligibleFilteredPuzzles.length >= 1) {
      currentPuzzle.set(Util.getRandomElement($eligibleFilteredPuzzles));
      return;
    } else if ($eligibleOtherPuzzles.length >= 1) {
      currentPuzzle.set(Util.getRandomElement($eligibleOtherPuzzles));
      return;
    }

    currentPuzzle.set(Util.getRandomElement($allPuzzles));
  }

  export function addPuzzleToHistory(puzzleId) {
    puzzleHistory.update((history) => {
      return [puzzleId, ...history];
    });
  }

  function sortPuzzlesBySolveTime(a, b) {
    const aTime = a.average_solve_time;
    const bTime = b.average_solve_time;

    if (aTime === null && bTime === null) {
      return 0;
    }
    if (aTime === null) {
      return 1;
    }
    if (bTime === null) {
      return -1;
    }
    return aTime - bTime;
  }

  export async function savePuzzleResult(result) {
    const data = await RailsAPI.savePuzzleResult(result);
    const updatedPuzzle = data.puzzle;
    const wasComplete = $currentPuzzle.complete;
    currentPuzzle.set(updatedPuzzle);
    if ($currentPuzzle.complete || (wasComplete && !$currentPuzzle.complete)) {
      await updateActivePuzzles();
    }
    updatePuzzleStores(updatedPuzzle);
  }

  export function updatePuzzleStores(updatedPuzzle) {
    const updateStore = (store) => {
      store.update((puzzles) =>
        puzzles.map((puzzle) =>
          puzzle.puzzle_id === updatedPuzzle.puzzle_id ? updatedPuzzle : puzzle,
        ),
      );
    };

    updateStore(allPuzzles);
    updateStore(activePuzzles);
    updateStore(allFilteredPuzzles);

    currentPuzzle.update((puzzle) =>
      puzzle && puzzle.puzzle_id === updatedPuzzle.puzzle_id
        ? updatedPuzzle
        : puzzle,
    );
  }

  let minimumTimeBetweenReviews = 0;
  let oddsOfRandomCompleted = 0.1;
  let minimumPuzzlesBetweenReviews = 10;

  async function refreshSettings() {
    minimumTimeBetweenReviews = getSetting("puzzles.minimumTimeBetween", 0);
    oddsOfRandomCompleted = getSetting("puzzles.oddsOfRandomCompleted", 0.1);
    minimumPuzzlesBetweenReviews = getSetting(
      "puzzles.minimumPuzzlesBetweenReviews",
    );
    void updateActivePuzzles();
  }

  let unsubscribeSettings = () => {};

  // Initialize puzzles on mount
  onMount(async () => {
    await refreshSettings();
    await updateActivePuzzles();
    await fetchAllPuzzles();
    await fetchAllFilteredPuzzles();
    await updateRandomCompletedPuzzle();
    await updateCurrentPuzzle();
    unsubscribeSettings = settings.subscribe(refreshSettings);
    dispatch("ready");
  });

  onDestroy(() => {
    unsubscribeSettings();
  });
</script>
