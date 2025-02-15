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

  static otherShortColor(color) {
    return color === "w" ? "b" : "w";
  }

  static whoseMoveIsIt(ply) {
    return ply % 2 === 0 ? "white" : "black";
  }

  static currentMicrotime() {
    return new Date().getTime();
  }

  static getCurrentUnixTime() {
    return Math.floor(new Date().getTime() / 1000);
  }

  static sortRandomly(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const randomIndex = Util.getRandomIntBetween(0, i);
      // Swap elements array[i] and array[randomIndex]
      [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
  }

  static GUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  static async fetch(url, options = {}) {
    // Ensure options.headers exists and is an object
    options.headers = options.headers || {};

    // Get CSRF token from meta tag
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");

    // Include CSRF token in headers
    options.headers["X-CSRF-Token"] = csrfToken;
    options.headers["Content-Type"] = "application/json";

    // Call the original fetch with the modified options
    return fetch(url, options);
  }

  static isDev() {
    if (typeof window !== "undefined" && window.document !== undefined) {
      if (window.location.search.includes("debug=1")) {
        return true;
      }
    }
    return false;
  }

  static log(...args) {
    if (Util.isDev()) {
      console.log(...args);
    }
  }

  static info(...args) {
    if (Util.isDev()) {
      console.info(...args);
    }
  }

  static warn(...args) {
    if (Util.isDev()) {
      console.warn(...args);
    }
  }

  static error(...args) {
    if (Util.isDev()) {
      console.error(...args);
    }
  }

  static debug(...args) {
    if (Util.isDev()) {
      console.debug(...args);
    }
  }
}

export { Util };
