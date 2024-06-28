class Util {
  static getRootCssVarValue(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
  }

  static getRandomIntBetween(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static getRandomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  static getRandomElement(array) {
    const index = Util.getRandomIndex(array.length);
    return array[index];
  }

  static otherColor(color) {
    if (color === "white") {
      return "black";
    }
    return "white";
  }
}

export { Util };
