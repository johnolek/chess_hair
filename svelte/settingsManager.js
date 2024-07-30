import { writable } from "svelte/store";
import { Util } from "src/util";
import * as RailsAPI from "./railsApi";

export const settings = writable({});
let localSettings = {};
let initialized = false;

export async function initSettings() {
  const settingsData = await RailsAPI.fetchSettings();
  settings.set(settingsData);
  localSettings = settingsData;
  initialized = true;
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
  if (!initialized) {
    await initSettings();
  }
  return localSettings[key] ?? defaultValue;
}
