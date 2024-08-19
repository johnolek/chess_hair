<script>
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import * as RailsAPI from "./railsApi";

  // State stores
  import {
    activePuzzles,
    currentPuzzle,
    nextPuzzle,
    totalIncorrectPuzzlesCount,
    totalFilteredPuzzlesCount,
    completedFilteredPuzzlesCount,
  } from "./stores.js";

  const dispatch = createEventDispatcher();

  export async function updateActivePuzzles() {
    const response = await RailsAPI.fetchActivePuzzles();
    activePuzzles.set(response.puzzles);
    totalIncorrectPuzzlesCount.set(response.total_incorrect_puzzles_count);
    totalFilteredPuzzlesCount.set(response.total_filtered_puzzles_count);
    completedFilteredPuzzlesCount.set(
      response.completed_filtered_puzzles_count,
    );
  }

  async function fetchNextPuzzle() {
    const puzzleIdToExclude = $currentPuzzle?.id || null;
    const puzzle = await RailsAPI.fetchNextPuzzle(puzzleIdToExclude);
    if (!puzzle) {
      return;
    }
    nextPuzzle.set(puzzle);
  }

  async function getFirstPuzzles() {
    const puzzle = await RailsAPI.fetchNextPuzzle();
    currentPuzzle.set(puzzle);
    void fetchNextPuzzle();
  }

  export async function updateCurrentPuzzle() {
    if ($nextPuzzle) {
      currentPuzzle.set($nextPuzzle);
      void fetchNextPuzzle();
    } else {
      const puzzle = await RailsAPI.fetchNextPuzzle();
      currentPuzzle.set(puzzle);
      void fetchNextPuzzle();
    }
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
    } else {
      updatePuzzleStores(updatedPuzzle);
    }
  }

  export function updatePuzzleStores(updatedPuzzle) {
    const updateStore = (store) => {
      store.update((puzzles) =>
        puzzles.map((puzzle) =>
          puzzle.id === updatedPuzzle.id ? updatedPuzzle : puzzle,
        ),
      );
    };

    updateStore(activePuzzles);

    currentPuzzle.update((puzzle) =>
      puzzle && puzzle.id === updatedPuzzle.id ? updatedPuzzle : puzzle,
    );
  }

  // Initialize puzzles on mount
  onMount(async () => {
    await getFirstPuzzles();
    void updateActivePuzzles();
    dispatch("ready");
  });

  onDestroy(async () => {
    activePuzzles.set([]);
  });
</script>
