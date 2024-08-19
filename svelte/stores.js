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
export const drillModeTheme = persisted("puzzles.drillModeTheme", "mateIn1");
export const drillModeLevels = persisted("puzzles.drillModeLevels", {});
