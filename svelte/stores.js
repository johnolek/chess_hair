import { persisted } from "svelte-persisted-store";

export const pieceSet = persisted("global.pieceSet", "merida");
export const boardStyle = persisted("global.boardStyle", "brown");
export const whiteBoardStyle = persisted("global.whiteBoardStyle", "brown");
export const blackBoardStyle = persisted("global.blackBoardStyle", "brown");
export const whitePieceSet = persisted("global.whitePieceSet", "merida");
export const blackPieceSet = persisted("global.blackPieceSet", "merida");
