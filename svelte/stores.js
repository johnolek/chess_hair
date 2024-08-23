import { persisted } from "svelte-persisted-store";
import { writable } from "svelte/store";

export const pieceSet = persisted("global.pieceSet", "maestro");
export const boardStyle = persisted("global.boardStyle", "brown");
export const whiteBoardStyle = persisted("global.whiteBoardStyle", "brown");
export const blackBoardStyle = persisted("global.blackBoardStyle", "brown");
export const whitePieceSet = persisted("global.whitePieceSet", "maestro");
export const blackPieceSet = persisted("global.blackPieceSet", "maestro");

export const stockfishLines = persisted("global.stockfishLines", 5);
export const stockfishCores = persisted("global.stockfishCores", 1);
export const stockfishDepth = persisted("global.stockfishDepth", 22);

export const settings = writable({});

export const activePuzzles = writable([]);
export const currentPuzzle = writable(null);
export const nextPuzzle = writable(null);
export const totalIncorrectPuzzlesCount = writable(0);
export const totalFilteredPuzzlesCount = writable(0);
export const completedFilteredPuzzlesCount = writable(0);

export const puzzleMode = persisted("puzzles.puzzleMode", "failedLichess");
export const drillModePerformance = writable(0.5);
export const drillModeTheme = persisted("puzzles.drillModeTheme", "mateIn1");
export const drillModeLevels = writable({});
export const drillModeMinPuzzles = persisted("puzzles.drillModeMinLevels", 3);
export const drillModeRollingAverage = persisted(
  "puzzles.drillModeRollingAverage",
  7,
);
export const drillModeGoBackThreshold = persisted(
  "puzzles.drillModeGoBackThreshold",
  0.4,
);
export const drillModeMoveOnThreshold = persisted(
  "puzzles.drillModeMoveOnThreshold",
  0.8,
);
export const drillModeTimeGoal = persisted("puzzles.drillModeTimeGoal", 20000);
export const drillModeAutoSelectWorst = persisted(
  "puzzles.drillModeAutoSelectWorst",
  true,
);
export const drillModeAvoidThemes = persisted(
  "puzzles.drillModeAvoidThemes",
  [],
);
