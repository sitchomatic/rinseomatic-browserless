import React from "react";
import { base44 } from "@/api/base44Client";

const SENSITIVE_KEYS = /password|token|secret|key|authorization|cookie|credential/i;

export default function NetworkTerminalTracker() {
  const loggingRef = React.useRef(false);
  const { data: userPrefs } = useTerminalPrefs();
  const enabled = userPrefs?.terminal_trace_enabled ?? true;
  const networkEnabled = userPrefs?.terminal_trace_network ?? true;
  const responsePreview = userPrefs?.terminal_trace_responses ?? true;
  const verboseBodies = userPrefs?.terminal_trace_verbose ?? true;

  React.useEffect(() => {
    if (!enabled || !networkEnabled) return;
    const originalFetch = window.fetch;
    const OriginalXHR = window.XMLHttpRequest;

    const safeWrite = (message, category, level) => {
      if (loggingRef.current) return;
      loggingRef.current = true;
      writeTerminal(message, category, level).finally(() => {
        loggingRef.current = false;
      });
    };

    window.fetch = async (input, init = {}) => {
      if (loggingRef.current) return originalFetch(input, init);
      const started = Date.now();
      const url = typeof input === "string" ? input : input?.url || "unknown";
      if (shouldSkipUrl(url)) return originalFetch(input, init);
      const method = init?.method || (typeof input !== "string" ? input?.method : null) || "GET";
      safeWrite(`HTTP → ${method.toUpperCase()} ${shortUrl(url)} ${verboseBodies ? summarizeBody(init?.body) : ""}`, "network", "debug");

      try {
        const response = await originalFetch(input, init);
        const body = responsePreview ? await response.clone().text().catch(() => "") : "";
        safeWrite(`HTTP ← ${response.status} ${method.toUpperCase()} ${shortUrl(url)} · ${Date.now() - started}ms ${body ? `· response=${redact(body).slice(0, 360)}` : ""}`, "network", response.ok ? "success" : "warn");
        return response;
      } catch (error) {
        safeWrite(`HTTP × ${method.toUpperCase()} ${shortUrl(url)} · ${error.message}`, "network", "error");
        throw error;
      }
    };

    window.XMLHttpRequest = function TracedXMLHttpRequest() {
      const xhr = new OriginalXHR();
      let method = "GET";
      let url = "unknown";
      let started = 0;
      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      xhr.open = function tracedOpen(nextMethod, nextUrl, ...args) {
        method = String(nextMethod || "GET").toUpperCase();
        url = String(nextUrl || "unknown");
        return originalOpen.call(xhr, nextMethod, nextUrl, ...args);
      };

      xhr.send = function tracedSend(body) {
        if (shouldSkipUrl(url)) return originalSend.call(xhr, body);
        started = Date.now();
        safeWrite(`XHR → ${method} ${shortUrl(url)} ${verboseBodies ? summarizeBody(body) : ""}`, "network", "debug");
        xhr.addEventListener("loadend", () => {
          const responseText = responsePreview ? xhr.responseText : "";
          safeWrite(`XHR ← ${xhr.status} ${method} ${shortUrl(url)} · ${Date.now() - started}ms ${responseText ? `· response=${redact(responseText).slice(0, 360)}` : ""}`, "network", xhr.status >= 200 && xhr.status < 400 ? "success" : "warn");
        });
        return originalSend.call(xhr, body);
      };

      return xhr;
    };

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
    };
  }, [enabled, networkEnabled, responsePreview, verboseBodies]);

  return null;
}

function useTerminalPrefs() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setData).catch(() => setData({}));
  }, []);

  return { data };
}

function shouldSkipUrl(url) {
  const text = String(url || "");
  return text.includes("ActionLog") || text.includes("logAuditEvent") || text.includes("terminal-network");
}

function writeTerminal(message, category, level) {
  return base44.entities.ActionLog.create({
    session_id: "terminal-network",
    level,
    category,
    message: message.slice(0, 1200),
    delta_ms: 0,
    timestamp: new Date().toISOString(),
    site: window.location.pathname,
  }).catch(() => {});
}

function shortUrl(url) {
  const text = String(url || "");
  if (text.startsWith("http")) {
    try {
      const parsed = new URL(text);
      return `${parsed.origin}${parsed.pathname}`.replace(window.location.origin, "");
    } catch (_) {
      return redact(text).slice(0, 180);
    }
  }
  return redact(text).slice(0, 180);
}

function summarizeBody(body) {
  if (!body) return "";
  if (typeof body === "string") return `· body=${redact(body).slice(0, 240)}`;
  if (body instanceof FormData) return "· body=FormData";
  if (body instanceof Blob) return `· body=Blob(${body.size})`;
  return `· body=${redact(String(body)).slice(0, 160)}`;
}

function redact(value) {
  let text = String(value || "");
  try {
    const json = JSON.parse(text);
    text = JSON.stringify(redactObject(json));
  } catch (_) {}
  return text
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:token|key|secret|password)=)[^&]+/gi, "$1[REDACTED]");
}

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactObject(val)]));
}