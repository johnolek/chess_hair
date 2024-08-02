import { BaseNode } from "./BaseNode";

class MoveNode extends BaseNode {
  constructor(move, parent = null) {
    super();
    this.move = move;
    this.children = {};
    this.parent = parent;
    this.isMainLine = true;
  }

  getLastMove() {
    return [this.move.from, this.move.to];
  }

  getFen() {
    return this.move.after;
  }

  createChild(move) {
    return new MoveNode(move, this);
  }
}

export { MoveNode };
