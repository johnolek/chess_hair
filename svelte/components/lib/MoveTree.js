import { Util } from "src/util";
import { RootNode } from "./RootNode";

class MoveTree {
  constructor(fen) {
    this.rootNode = new RootNode(fen);
    /** @type {MoveNode} */
    this.currentNode = this.rootNode;
    this.moveMap = { [this.rootNode.getGuid()]: this.rootNode };
  }

  addMove(chessJsCompatibleMove) {
    this.currentNode = this.currentNode.addChild(chessJsCompatibleMove);
    this.moveMap[this.currentNode.getGuid()] = this.currentNode;
    Util.info({ moveTree: this });
  }

  goToNode(nodeGuid) {
    this.currentNode = this.moveMap[nodeGuid];
  }

  goToParent() {
    if (this.currentNode.parent) {
      this.goToNode(this.currentNode.parent.getGuid());
    }
  }
}

export { MoveTree };
