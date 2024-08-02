import { Util } from "src/util";
import { getLegalMovesMap } from "./chess_functions";
import { Chess } from "chess.js";

class BaseNode {
  constructor() {
    this.children = {};
    this.guid = Util.GUID();
    this.parent = null;
  }

  getGuid() {
    return this.guid;
  }

  getFen() {
    throw new Error("Not implemented");
  }

  getFullMove(chessJsCompatibleMove) {
    const chess = this.chessInstance();
    const move = chess.move(chessJsCompatibleMove);
    move.isCheckmate = chess.isCheckmate();
    move.fullMove = chess.moveNumber();
    move.moveIndex = this.moveIndex();
    return move;
  }

  moveIndex() {
    if (!this.parent) {
      return 0;
    }
    return this.parent.moveIndex() + 1;
  }

  getLastMove() {
    return null;
  }

  legalMoves() {
    return getLegalMovesMap(this.getFen());
  }

  inCheck() {
    const chess = new Chess(this.getFen());
    return chess.inCheck();
  }

  isCheckmate() {
    return this.chessInstance().isCheckmate();
  }

  turnColor() {
    const chess = new Chess(this.getFen());
    return chess.turn() === "w" ? "white" : "black";
  }

  pieceAtSquare(square) {
    return this.chessInstance().get(square).type;
  }

  chessInstance() {
    return new Chess(this.getFen());
  }
}

export { BaseNode };
