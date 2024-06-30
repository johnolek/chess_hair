<script>
  let puzzleData = "";
  let puzzles = [];
  let filteredPuzzles = [];
  let minRating = 0;
  let maxRating = 3000;
  let correctSolves = true;
  let incorrectSolves = true;

  function processPuzzleData() {
    puzzles = puzzleData.trim().split("\n").map(JSON.parse);
  }

  function filterPuzzles() {
    filteredPuzzles = puzzles.filter((puzzle) => {
      const rating = puzzle.puzzle.rating;
      const win = puzzle.win;
      return (
        rating >= minRating &&
        rating <= maxRating &&
        ((win && correctSolves) || (!win && incorrectSolves))
      );
    });
    filteredPuzzles = filteredPuzzles; // Trigger reactivity
  }

  let uniqueFilteredPuzzleIds = [];
  $: {
    uniqueFilteredPuzzleIds = [
      ...new Set(filteredPuzzles.map((puzzle) => puzzle.puzzle.id)),
    ];
  }
</script>

{#if puzzles.length === 0}
  <textarea bind:value={puzzleData}></textarea>
  <button class="button is-primary" on:click={processPuzzleData}
    >Load Data</button
  >
{/if}

<form on:submit|preventDefault={filterPuzzles}>
  <label for="minRating">Min Rating:</label>
  <input
    type="number"
    id="minRating"
    bind:value={minRating}
    min="0"
    max="3000"
  />
  <label for="maxRating">Max Rating:</label>
  <input
    type="number"
    id="maxRating"
    bind:value={maxRating}
    min={minRating + 1}
    max="3000"
  />
  <label for="correctSolves">Correct Solves:</label>
  <input type="checkbox" id="correctSolves" bind:checked={correctSolves} />
  <br />
  <label for="incorrectSolves">Incorrect Solves:</label>
  <input type="checkbox" id="incorrectSolves" bind:checked={incorrectSolves} />
  <br />
  <button class="button is-primary" type="submit">Filter</button>
</form>

{#if filteredPuzzles.length > 0}
  <p>Found {uniqueFilteredPuzzleIds.length} matching puzzles</p>
  <textarea readonly>
    {uniqueFilteredPuzzleIds.join(",")}
  </textarea>
{/if}
