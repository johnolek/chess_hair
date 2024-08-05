import { Util } from "../app/javascript/src/util";

const BASE_URL = "/api/v1";

async function apiCall(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
  };
  options.headers = { ...defaultHeaders, ...options.headers };

  const response = await Util.fetch(`${BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return await response.json();
}

async function getApiCall(endpoint, queryParams = {}, headers = {}) {
  const queryString = new URLSearchParams(queryParams).toString();
  const urlWithParams = queryString ? `${endpoint}?${queryString}` : endpoint;
  return await apiCall(urlWithParams, { headers });
}

async function postApiCall(endpoint, body, headers = {}) {
  return await apiCall(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function putApiCall(endpoint, body, headers = {}) {
  return await apiCall(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

async function deleteApiCall(endpoint, headers = {}) {
  return await apiCall(endpoint, {
    method: "DELETE",
    headers,
  });
}

export async function fetchActivePuzzles() {
  return await getApiCall("/user/active-puzzles");
}

export async function fetchAllPuzzles() {
  return await getApiCall("/user/all-puzzles");
}

export async function fetchNextPuzzle(puzzleIdToExclude = null) {
  const params = {};
  if (puzzleIdToExclude) {
    params.exclude_puzzle_id = puzzleIdToExclude;
  }
  return await getApiCall("/user/next-puzzle", params);
}

export async function fetchFilteredPuzzles() {
  return await getApiCall("/user/all-filtered-puzzles");
}

export async function updateSetting(settingKey, value) {
  return await putApiCall(`/settings/${settingKey}`, { value });
}

export async function fetchSettings() {
  return await getApiCall("/user/settings");
}

export async function getUserInfo() {
  return await getApiCall("/user/info");
}

export async function addCurrentPuzzleToFavorites(currentPuzzle) {
  return await postApiCall(`/user/add-favorite/${currentPuzzle.id}`, {});
}

export async function removeCurrentPuzzleFromFavorites(currentPuzzle) {
  return await deleteApiCall(`/user/remove-favorite/${currentPuzzle.id}`);
}

export async function triggerPuzzleImport() {
  return await postApiCall("/user/import-new-puzzle-histories", {});
}

export async function savePuzzleResult(result) {
  return await postApiCall("/puzzle_results", {
    puzzle_result: result,
  });
}
