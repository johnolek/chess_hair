import { Util } from "src/util";
import * as RailsAPI from "./railsApi";
import { settings } from "./stores";

let localSettings = {};
let initPromise = null;

export async function initSettings() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const settingsData = await RailsAPI.fetchSettings();
    settings.set(settingsData);
    localSettings = settingsData;
    initPromise = null; // Clear the promise after initialization
  })();

  return initPromise;
}

// Update a setting both locally and on the server
export async function updateSetting(key, value) {
  const response = await Util.fetch("/api/v1/user/update_setting", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  if (response.ok) {
    localSettings[key] = value;
    settings.set(localSettings);
  }
}

// Get a setting value by key, with an optional default
export async function getSetting(key, defaultValue = null) {
  return localSettings[key] ?? defaultValue;
}
