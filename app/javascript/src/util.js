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

  static whoseMoveIsIt(ply) {
    return ply % 2 === 0 ? "white" : "black";
  }

  static currentMicrotime() {
    return new Date().getTime();
  }

  static sortRandomly(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const randomIndex = Util.getRandomIntBetween(0, i);
      // Swap elements array[i] and array[randomIndex]
      [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
  }
}

export { Util };
