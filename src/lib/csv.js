// Minimal CSV parser (handles quoted fields and commas within quotes).
export function parseCSV(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); rows.push(row); row = []; cur = "";
      } else cur += ch;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Detect site key from a row's hints (url, domain, or explicit site column).
const SITE_HINTS = {
  joe: ["joe", "joespecs", "joeauto"],
  ignition: ["ignition", "ignitionone"],
  ppsr: ["ppsr"],
  double: ["double", "doubleup", "doublecheck"],
};

export function detectSite(explicitSite, ...hints) {
  const val = (explicitSite || "").trim().toLowerCase();
  if (["joe", "ignition", "ppsr", "double"].includes(val)) return val;
  const hay = hints.filter(Boolean).join(" ").toLowerCase();
  for (const [key, needles] of Object.entries(SITE_HINTS)) {
    if (needles.some((n) => hay.includes(n))) return key;
  }
  return null;
}