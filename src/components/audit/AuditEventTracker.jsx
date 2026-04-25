import React from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

function describeElement(element) {
  if (!element) return "unknown element";
  if (element.type === "password") return "password field";
  const label = element.getAttribute?.("aria-label") || element.getAttribute?.("title") || element.innerText || element.name || element.id || element.placeholder || element.tagName;
  return String(label || "element").trim().replace(/\s+/g, " ").slice(0, 120);
}

function writeAudit(message, category = "system", level = "info") {
  base44.entities.ActionLog.create({
    level,
    category,
    message,
    timestamp: new Date().toISOString(),
    delta_ms: 0,
    session_id: "live-ui",
  }).catch(() => {});
}

export default function AuditEventTracker() {
  const location = useLocation();
  const lastInputRef = React.useRef(0);

  React.useEffect(() => {
    writeAudit(`Viewed ${location.pathname}${location.search || ""}`);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    const onClick = (event) => {
      const target = event.target?.closest?.("button, a, [role='button'], input, select, textarea");
      if (!target) return;
      const type = target.tagName?.toLowerCase() || "element";
      writeAudit(`Clicked ${type}: ${describeElement(target)}`, "system");
    };

    const onSubmit = (event) => {
      writeAudit(`Submitted form: ${describeElement(event.target)}`, "system", "success");
    };

    const onInput = (event) => {
      const now = Date.now();
      if (now - lastInputRef.current < 2500) return;
      lastInputRef.current = now;
      const target = event.target;
      const type = target?.type === "password" ? "password field" : target?.tagName?.toLowerCase() || "input";
      writeAudit(`Updated ${type}: ${describeElement(target)}`, "system");
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("input", onInput, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  return null;
}