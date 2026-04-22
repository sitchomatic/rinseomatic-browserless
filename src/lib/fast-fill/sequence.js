// Ports the fast-fill orchestration sequence from BrowserViewModel.swift
// (loadMatchingCredentials → prefetchPasswords → rotateCredential +
//  pre-warm next credential → performAutoLogin).
//
// Unlike the iOS app we don't have a WKWebView + Keychain, so `executeScript`
// is abstracted: pass any function that takes a JS string and returns
// (asynchronously) whatever that script evaluated to. In the preview we use
// a same-origin iframe; at real run-time the flow runner will pipe it to the
// remote browser driver.

import {
  fillHelperScript,
  fillCredentialScript,
  submitFormScript,
  detectLoginFormScript,
  extractFilledCredentialsScript,
  canonicalizeDomain,
} from "./scripts";

/**
 * Run the exact same sequence the iOS Browser uses:
 *   1. inject fill helpers
 *   2. (optional) detect login form — bails with `no_form` if none visible
 *   3. wait `waitAfterLoadMs`
 *   4. fill credential (custom selectors if provided, fallback list otherwise)
 *   5. if `autoSubmit` — fire the submit script
 *
 * Returns a structured timeline so the UI can render per-step status, matching
 * the log output BrowserViewModel emits via `showToast`.
 */
export async function runFastFillSequence({
  executeScript,
  credential,           // { username, password }
  fastFill,             // flow.fast_fill config
  logger = () => {},
}) {
  const timeline = [];
  const push = (step, status, data) => {
    const entry = { step, status, at: Date.now(), ...(data || {}) };
    timeline.push(entry);
    logger(entry);
  };

  if (!credential?.username || !credential?.password) {
    push("guard", "error", { message: "No credential supplied" });
    return { ok: false, timeline };
  }
  if (!fastFill) {
    push("guard", "error", { message: "No fast_fill config" });
    return { ok: false, timeline };
  }

  // 1. helpers
  push("inject_helpers", "running");
  try {
    await executeScript(fillHelperScript());
    push("inject_helpers", "done");
  } catch (e) {
    push("inject_helpers", "error", { message: String(e?.message || e) });
    return { ok: false, timeline };
  }

  // 2. detect
  push("detect_form", "running");
  let detected = { hasLoginForm: false, passwordFieldCount: 0, loginFormCount: 0 };
  try {
    const raw = await executeScript(detectLoginFormScript());
    detected = safeParse(raw, detected);
    push("detect_form", detected.hasLoginForm ? "done" : "warn", detected);
  } catch (e) {
    push("detect_form", "warn", { message: String(e?.message || e) });
  }

  // 3. wait
  const waitMs = Number(fastFill.wait_after_load_ms) || 0;
  if (waitMs > 0) {
    push("wait", "running", { ms: waitMs });
    await new Promise((r) => setTimeout(r, waitMs));
    push("wait", "done", { ms: waitMs });
  }

  // 4. fill
  push("fill", "running");
  let fill = { filled: 0, userFound: false, passFound: false };
  try {
    const raw = await executeScript(
      fillCredentialScript({
        username: credential.username,
        password: credential.password,
        usernameSelector: fastFill.username_selector,
        passwordSelector: fastFill.password_selector,
      })
    );
    fill = safeParse(raw, fill);
    const ok = fill.userFound && fill.passFound;
    push("fill", ok ? "done" : "warn", fill);
    if (!ok) return { ok: false, timeline, fill };
  } catch (e) {
    push("fill", "error", { message: String(e?.message || e) });
    return { ok: false, timeline };
  }

  // 5. submit
  if (fastFill.auto_submit) {
    push("submit", "running");
    try {
      const raw = await executeScript(submitFormScript(fastFill.submit_selector));
      const res = safeParse(raw, { submitted: false });
      push("submit", res.submitted ? "done" : "warn", res);
    } catch (e) {
      push("submit", "error", { message: String(e?.message || e) });
    }
  }

  return { ok: true, timeline };
}

/**
 * Mirror of BrowserViewModel.extractFilledCredentials — used to harvest a
 * form the user already typed into (the "Save this login?" flow on iOS).
 */
export async function extractFilledCredentials({ executeScript }) {
  const raw = await executeScript(extractFilledCredentialsScript());
  return safeParse(raw, { found: false });
}

/**
 * Returns the list of credentials whose `site` or stored domain matches the
 * fast-fill target — parity with `loadMatchingCredentials(for:)`.
 */
export function matchCredentials({ credentials, fastFill, site }) {
  const target = canonicalizeDomain(fastFill?.domain || fastFill?.target_url || "");
  return credentials.filter((c) => {
    if (site && c.site !== site) return false;
    if (!target) return true;
    const cDomain = canonicalizeDomain(c.site || "");
    return !cDomain || cDomain === target || target.endsWith(cDomain);
  });
}

function safeParse(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try { return JSON.parse(String(v)); } catch { return fallback; }
}