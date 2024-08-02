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

  addChild(chessJsCompatibleMove) {
    const move = this.getFullMove(chessJsCompatibleMove);
    if (!this.children[move.lan]) {
      this.children[move.lan] = new MoveNode(move, this);
    }
    return this.children[chessJsCompatibleMove];
  }
}

export { RootNode };
