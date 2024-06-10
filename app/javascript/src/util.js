class Util {
  static removeAllUndesiredLinks() {
    const analysisLinks = [...document.querySelectorAll('.lpv__menu__analysis')];
    const practiceLinks = [...document.querySelectorAll('.lpv__menu__practice')];
    const allLinks = [...analysisLinks, ...practiceLinks];
    allLinks.forEach((link) => {
      link.parentNode.removeChild(link);
    });
  }
}

export { Util };
