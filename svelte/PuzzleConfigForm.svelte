<script>
  import { onMount } from "svelte";
  import { updateSetting, initSettings, getSetting } from "./settingsManager";
  import NumberInput from "./components/forms/NumberInput.svelte";

  let batchSize,
    minimumPuzzlesBetweenReviews,
    minimumTimeBetweenReviews,
    oddsOfRandomCompleted,
    requiredConsecutiveSolves,
    timeGoal,
    minimumRating,
    maximumRating;

  let settingUpdating = false;

  onMount(async () => {
    batchSize = await getSetting("puzzles.batchSize", 10);
    minimumTimeBetweenReviews = await getSetting(
      "puzzles.minimumTimeBetween",
      0,
    );
    minimumPuzzlesBetweenReviews = await getSetting(
      "puzzles.minimumPuzzlesBetweenReviews",
      10,
    );
    oddsOfRandomCompleted = await getSetting(
      "puzzles.oddsOfRandomCompleted",
      0.1,
    );
    requiredConsecutiveSolves = await getSetting(
      "puzzles.consecutiveSolves",
      2,
    );
    timeGoal = await getSetting("puzzles.timeGoal", 60);
    minimumRating = await getSetting("puzzles.minRating", 1);
    maximumRating = await getSetting("puzzles.maxRating", 3500);
  });
</script>

<NumberInput
  label="Batch Size"
  helpText="How many puzzles you want to focus on at a time."
  min={5}
  max={50}
  step={1}
  isLoading={settingUpdating}
  bind:value={batchSize}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.batchSize", value);
    settingUpdating = false;
  }}
/>
<NumberInput
  label="Minimum Puzzles Between Reviews"
  helpText="The number of other puzzles you will see before repeating a puzzle."
  min={0}
  max={50}
  step={1}
  isLoading={settingUpdating}
  bind:value={minimumPuzzlesBetweenReviews}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.minimumPuzzlesBetweenReviews", value);
    settingUpdating = false;
  }}
/>
<NumberInput
  label="Minimum Time Between Reviews"
  helpText="The minimum time in seconds between reviewing the same puzzle."
  min={0}
  max={60 * 60 * 24 * 7}
  step={1}
  isLoading={settingUpdating}
  bind:value={minimumTimeBetweenReviews}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.minimumTimeBetween", value);
    settingUpdating = false;
  }}
/>
<NumberInput
  label="Odds of Random Completed Puzzle"
  helpText="A number between 0 and 1 representing the odds of getting a random completed puzzle instead of one from the current batch. 1 = always random, 0 = never random, .25 = 25% chance."
  min={0}
  max={1}
  step={0.01}
  isLoading={settingUpdating}
  bind:value={oddsOfRandomCompleted}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.oddsOfRandomCompleted", value);
    settingUpdating = false;
  }}
/>
<hr />
<NumberInput
  label="Required Consecutive Solves"
  helpText="How many times you need to solve a puzzle correctly in a row to consider it completed."
  min={1}
  max={10}
  step={1}
  isLoading={settingUpdating}
  bind:value={requiredConsecutiveSolves}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.consecutiveSolves", value);
    settingUpdating = false;
  }}
/>
<NumberInput
  label="Time Goal"
  helpText={`The target time to solve a puzzle in seconds. A puzzle will be considered completed if the average of the last ${requiredConsecutiveSolves} solves is less than this time.`}
  min={10}
  max={1000}
  step={1}
  isLoading={settingUpdating}
  bind:value={timeGoal}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.timeGoal", value);
    settingUpdating = false;
  }}
/>
<hr />
<NumberInput
  label="Minimum Rating"
  helpText="Only include Lichess puzzles with a rating of at least this amount."
  min={1}
  max={3500}
  step={1}
  isLoading={settingUpdating}
  bind:value={minimumRating}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.minRating", value);
    settingUpdating = false;
  }}
/>
<NumberInput
  label="Maximum Rating"
  helpText="Only include Lichess puzzles with a rating less than this amount."
  min={1}
  max={3500}
  step={1}
  isLoading={settingUpdating}
  bind:value={maximumRating}
  onChange={async (value) => {
    settingUpdating = true;
    await updateSetting("puzzles.maxRating", value);
    settingUpdating = false;
  }}
/>
{#if settingUpdating}
  <h2>Updating...</h2>
  <progress class="progress is-small is-primary" max="100" />
{/if}
