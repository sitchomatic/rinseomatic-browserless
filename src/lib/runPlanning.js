const MAX_BROWSER_SESSIONS = 2;
const MIN_BROWSER_SESSIONS = 1;
const MAX_RETRIES = 3;
const MIN_RETRIES = 0;

export function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeRunForm(form = {}) {
  const recordingMode = ["replay", "video"].includes(form.recording_mode) ? form.recording_mode : "none";
  const screenshotMode = ["off", "final", "failures", "key_steps"].includes(form.screenshot_mode) ? form.screenshot_mode : "key_steps";
  const concurrency = recordingMode === "none"
    ? clampNumber(form.concurrency, MIN_BROWSER_SESSIONS, MAX_BROWSER_SESSIONS, 2)
    : 1;

  return {
    site_key: form.site_key || "",
    concurrency,
    max_retries: clampNumber(form.max_retries, MIN_RETRIES, MAX_RETRIES, 1),
    screenshot_mode: screenshotMode,
    recording_mode: recordingMode,
    label: (form.label || "").trim(),
  };
}

export function countCredentialsForSite(credentials = [], siteKey = "") {
  return siteKey ? credentials.length : 0;
}

export function credentialsForRun(allCredentials = [], selectedCredentials = [], siteKey = "") {
  if (!siteKey) return [];
  return selectedCredentials.length > 0 ? selectedCredentials : allCredentials;
}

export { MAX_BROWSER_SESSIONS, MIN_BROWSER_SESSIONS, MAX_RETRIES, MIN_RETRIES };