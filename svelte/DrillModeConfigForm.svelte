<script>
  import {
    drillModeTheme,
    drillModeMinPuzzles,
    drillModeRollingAverage,
    drillModeTimeGoal,
    drillModeGoBackThreshold,
    drillModeMoveOnThreshold,
    drillModeAutoSelectWorst,
  } from "./stores";

  const themeOptions = [
    "advancedPawn",
    "advantage",
    "anastasiaMate",
    "arabianMate",
    "attackingF2F7",
    "attraction",
    "backRankMate",
    "bishopEndgame",
    "bodenMate",
    "capturingDefender",
    "castling",
    "clearance",
    "crushing",
    "defensiveMove",
    "deflection",
    "discoveredAttack",
    "doubleBishopMate",
    "doubleCheck",
    "dovetailMate",
    "enPassant",
    "endgame",
    "equality",
    "exposedKing",
    "fork",
    "hangingPiece",
    "hookMate",
    "interference",
    "intermezzo",
    "kingsideAttack",
    "knightEndgame",
    "long",
    "master",
    "masterVsMaster",
    "mate",
    "mateIn1",
    "mateIn2",
    "mateIn3",
    "mateIn4",
    "mateIn5",
    "middlegame",
    "oneMove",
    "opening",
    "pawnEndgame",
    "pin",
    "promotion",
    "queenEndgame",
    "queenRookEndgame",
    "queensideAttack",
    "quietMove",
    "rookEndgame",
    "sacrifice",
    "short",
    "skewer",
    "smotheredMate",
    "superGM",
    "trappedPiece",
    "underPromotion",
    "veryLong",
    "xRayAttack",
    "zugzwang",
  ];
</script>

<div class="field">
  <label class="label" for="drill-theme">Drill Mode Theme</label>
  <div class="control">
    <div class="select">
      <select id="drill-theme" bind:value={$drillModeTheme}>
        {#each themeOptions as theme}
          <option value={theme} selected={theme === $drillModeTheme}>
            {theme}
          </option>
        {/each}
      </select>
    </div>
  </div>
</div>

<div class="field">
  <label class="label">
    Minimum Puzzles Per Level
    <input class="input" type="number" bind:value={$drillModeMinPuzzles} />
  </label>
</div>

<div class="field">
  <label class="label">
    Rolling Average Count
    <input class="input" type="number" bind:value={$drillModeRollingAverage} />
  </label>
</div>

<div class="field">
  <label class="label">
    Time Goal (ms)
    <input class="input" type="number" bind:value={$drillModeTimeGoal} />
  </label>
</div>

<div class="field">
  <label class="label">
    Go Back Threshold
    <input class="input" type="number" bind:value={$drillModeGoBackThreshold} />
  </label>
</div>

<div class="field">
  <label class="label">
    Move On Threshold
    <input class="input" type="number" bind:value={$drillModeMoveOnThreshold} />
  </label>
</div>
