import { persisted } from "svelte-persisted-store";

export const pieceSet = persisted("global.pieceSet", "merida");
export const boardStyle = persisted("global.boardStyle", "brown");

boardStyle.subscribe((value) => {
  if (document.body) {
    document.body.dataset.board = value;
  }
});
