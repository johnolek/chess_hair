import { persisted } from "svelte-persisted-store";
import { writable } from "svelte/store";

export const pieceSet = persisted("global.pieceSet", "merida");
export const boardStyle = persisted("global.boardStyle", "brown");
export const whiteBoardStyle = persisted("global.whiteBoardStyle", "brown");
export const blackBoardStyle = persisted("global.blackBoardStyle", "brown");
export const whitePieceSet = persisted("global.whitePieceSet", "merida");
export const blackPieceSet = persisted("global.blackPieceSet", "merida");

export const settings = writable({});

export const puzzleHistory = writable([]);
export const randomCompletedPuzzle = writable(null);
export const activePuzzles = writable([]);
export const allPuzzles = writable([]);
export const allFilteredPuzzles = writable([]);
export const eligibleActivePuzzles = writable([]);
export const eligibleOtherPuzzles = writable([]);
export const eligibleFilteredPuzzles = writable([]);
export const currentPuzzle = writable(null);
export const totalIncorrectPuzzlesCount = writable(0);
export const totalFilteredPuzzlesCount = writable(0);
export const completedFilteredPuzzlesCount = writable(0);
