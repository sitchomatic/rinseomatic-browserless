// Site theming & metadata used across the app.
export const SITES = {
  joe: { label: "Joe", accent: "text-sky-300", dot: "bg-sky-400", ring: "ring-sky-400/30", chip: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
  ignition: { label: "Ignition", accent: "text-amber-300", dot: "bg-amber-400", ring: "ring-amber-400/30", chip: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  ppsr: { label: "PPSR", accent: "text-emerald-300", dot: "bg-emerald-400", ring: "ring-emerald-400/30", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  double: { label: "Double", accent: "text-fuchsia-300", dot: "bg-fuchsia-400", ring: "ring-fuchsia-400/30", chip: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20" },
};

export const getSite = (key) => SITES[key] || { label: key || "Unknown", accent: "text-muted-foreground", dot: "bg-muted-foreground", ring: "", chip: "bg-muted text-muted-foreground border-border" };

export const formatMs = (ms) => {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};