import { Util } from "src/util";

class BaseNode {
  constructor() {
    this.children = {};
    this.guid = Util.GUID();
    this.lastMove = null;
  }

  getGuid() {
    return this.guid;
  }
}

export { BaseNode };
