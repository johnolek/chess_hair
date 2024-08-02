import { RootNode } from "./RootNode";

class MoveTree {
  constructor(rootNode) {
    this.rootNode = new RootNode(rootNode);
    /** @type {MoveNode} */
    this.currentNode = this.rootNode;
    this.moveMap = { [this.rootNode.getGuid()]: this.rootNode };
  }

  addMove(move) {
    this.currentNode = this.currentNode.addChild(move);
    this.moveMap[this.currentNode.getGuid()] = this.currentNode;
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
