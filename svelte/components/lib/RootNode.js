import { BaseNode } from "./BaseNode";
import { MoveNode } from "./MoveNode";

class RootNode extends BaseNode {
  constructor(fen) {
    super();
    this.fen = fen;
    this.children = {};
  }

  getFen() {
    return this.fen;
  }

  createChild(move) {
    return new MoveNode(move, this);
  }
}

export { RootNode };
