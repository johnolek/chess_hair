class Util {
  static removeAllUndesiredLinks() {
    const analysisLinks = [...document.querySelectorAll('.lpv__menu__analysis')];
    const practiceLinks = [...document.querySelectorAll('.lpv__menu__practice')];
    const allLinks = [...analysisLinks, ...practiceLinks];
    allLinks.forEach((link) => {
      link.parentNode.removeChild(link);
    });
  }

  static getRootCssVarValue(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
  }

  static getRandomIntBetween(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export { Util };
