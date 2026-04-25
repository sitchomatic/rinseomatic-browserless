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
  return {
    site_key: form.site_key || "",
    concurrency: clampNumber(form.concurrency, MIN_BROWSER_SESSIONS, MAX_BROWSER_SESSIONS, 2),
    max_retries: clampNumber(form.max_retries, MIN_RETRIES, MAX_RETRIES, 1),
    label: (form.label || "").trim(),
  };
}

export function countCredentialsForSite(credentials = [], siteKey = "") {
  if (!siteKey) return 0;
  let count = 0;
  for (const credential of credentials) {
    if (credential.site_key === siteKey) count += 1;
  }
  return count;
}

export function credentialsForRun(allCredentials = [], selectedCredentials = [], siteKey = "") {
  if (selectedCredentials.length > 0) return selectedCredentials;
  return allCredentials.filter((credential) => credential.site_key === siteKey);
}

export { MAX_BROWSER_SESSIONS, MIN_BROWSER_SESSIONS, MAX_RETRIES, MIN_RETRIES };