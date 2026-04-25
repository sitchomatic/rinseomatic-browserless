import React from "react";
import { base44 } from "@/api/base44Client";

const SENSITIVE_KEYS = /password|token|secret|key|authorization|cookie|credential/i;

export default function NetworkTerminalTracker() {
  React.useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init = {}) => {
      const started = Date.now();
      const url = typeof input === "string" ? input : input?.url || "unknown";
      const method = init?.method || (typeof input !== "string" ? input?.method : null) || "GET";
      writeTerminal(`HTTP → ${method.toUpperCase()} ${shortUrl(url)} ${summarizeBody(init?.body)}`, "network", "debug");

      try {
        const response = await originalFetch(input, init);
        writeTerminal(`HTTP ← ${response.status} ${method.toUpperCase()} ${shortUrl(url)} · ${Date.now() - started}ms`, "network", response.ok ? "success" : "warn");
        return response;
      } catch (error) {
        writeTerminal(`HTTP × ${method.toUpperCase()} ${shortUrl(url)} · ${error.message}`, "network", "error");
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

function writeTerminal(message, category, level) {
  base44.entities.ActionLog.create({
    session_id: "terminal-network",
    level,
    category,
    message: message.slice(0, 900),
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