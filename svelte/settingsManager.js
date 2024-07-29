import { writable } from "svelte/store";
import { Util } from "src/util";

export const settings = writable({});
let localSettings = {};

export async function initSettings() {
  const settingsResponse = await Util.fetch("/api/v1/user/settings");
  const settingsData = await settingsResponse.json();
  settings.set(settingsData);
  localSettings = settingsData;
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
export function getSetting(key, defaultValue = null) {
  return localSettings[key] ?? defaultValue;
}
