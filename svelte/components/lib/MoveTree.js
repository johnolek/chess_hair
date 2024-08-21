import { Util } from "src/util";
import { RootNode } from "./RootNode";

class MoveTree {
  constructor(fen) {
    this.rootNode = new RootNode(fen);
    /** @type {MoveNode|RootNode} */
    this.currentNode = this.rootNode;
    this.moveMap = { [this.rootNode.getGuid()]: this.rootNode };
  }

  addMove(chessJsCompatibleMove, isMainLine = true) {
    this.currentNode = this.currentNode.addChild(chessJsCompatibleMove);
    this.currentNode.isMainLine = isMainLine;
    this.moveMap[this.currentNode.getGuid()] = this.currentNode;
  }

  findNodeByFen(fen) {
    return Object.values(this.moveMap).find((node) => node.getFen() === fen);
  }

  getNodeByGuid(guid) {
    return this.moveMap[guid] || null;
  }

  goToRoot() {
    this.currentNode = this.rootNode;
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
