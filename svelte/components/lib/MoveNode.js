import { BaseNode } from "./BaseNode";

class MoveNode extends BaseNode {
  constructor(move, parent = null) {
    super();
    this.move = move;
    this.lastMove = [move.from, move.to];
    this.children = {};
    this.parent = parent;
  }

  addChild(move) {
    const uciMove = move.lan;
    if (!this.children[uciMove]) {
      this.children[uciMove] = new MoveNode(move, this);
    }
    return this.children[uciMove];
  }
}

export { MoveNode };
