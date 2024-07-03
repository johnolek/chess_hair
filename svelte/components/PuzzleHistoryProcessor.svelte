<script>
  let puzzleData = "";
  let puzzles = [];
  let filteredPuzzles = [];
  let minRating = 0;
  let maxRating = 5000;
  let correctSolves = false;
  let incorrectSolves = true;
  let filterSubmitted = false;

  function processPuzzleData() {
    puzzles = puzzleData.trim().split("\n").map(JSON.parse);
  }

  function filterPuzzles() {
    filterSubmitted = true;
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

  let uniquePuzzleIds = [];
  $: {
    uniquePuzzleIds = [...new Set(puzzles.map((puzzle) => puzzle.puzzle.id))];
  }

  let readonlyInput;
</script>

{#if uniquePuzzleIds.length === 0}
  <div class="field">
    <div class="control">
      <textarea class="textarea" bind:value={puzzleData}></textarea>
    </div>
  </div>
  <button class="button is-primary" on:click={processPuzzleData}
    >Load Data
  </button>
{:else}
  <p><strong>{uniquePuzzleIds.length}</strong> puzzles loaded.</p>
{/if}

<form on:submit|preventDefault={filterPuzzles}>
  <div class="field">
    <label class="label" for="minRating">Min Rating:</label>
    <div class="control">
      <input
        class="input"
        type="number"
        id="minRating"
        bind:value={minRating}
        min="0"
        max="4999"
      />
    </div>
  </div>
  <div class="field">
    <label class="label" for="maxRating">Max Rating:</label>
    <div class="control">
      <input
        class="input"
        type="number"
        id="maxRating"
        bind:value={maxRating}
        min={minRating + 1}
        max="5000"
      />
    </div>
  </div>
  <div class="field">
    <label class="checkbox" for="correctSolves">Correct Solves:</label>
    <input type="checkbox" id="correctSolves" bind:checked={correctSolves} />
  </div>
  <div class="field">
    <label class="checkbox" for="incorrectSolves">Incorrect Solves:</label>
    <input
      type="checkbox"
      id="incorrectSolves"
      bind:checked={incorrectSolves}
    />
  </div>
  <button class="button is-primary" type="submit">Filter</button>
</form>

{#if filterSubmitted}
  <p>
    Found <strong>{uniqueFilteredPuzzleIds.length}</strong> matching puzzles
  </p>
  <div class="field">
    <div class="control">
      <input
        class="input"
        bind:this={readonlyInput}
        type="text"
        readonly
        value={uniqueFilteredPuzzleIds.join(",")}
        on:focus={() => {
          readonlyInput.select();
        }}
      />
    </div>
  </div>
{/if}
