import { BaseNode } from "./BaseNode";

class MoveNode extends BaseNode {
  constructor(move, parent = null) {
    super();
    this.move = move;
    this.children = {};
    this.parent = parent;
  }

  addChild(chessJsCompatibleMove) {
    const move = this.getFullMove(chessJsCompatibleMove);
    if (!this.children[move.lan]) {
      this.children[move.lan] = new MoveNode(move, this);
    }
    return this.children[chessJsCompatibleMove];
  }

  getLastMove() {
    return [this.move.from, this.move.to];
  }

  getFen() {
    return this.move.after;
  }
}

export { MoveNode };
