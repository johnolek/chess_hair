<script>
  import { drillModeTheme } from "./stores";

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
