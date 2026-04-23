// Runtime-loaded sites live in the Site entity. This file only provides
// visual styling helpers keyed by site.key.

const PALETTE = [
  { chip: 'bg-sky-500/10 text-sky-300 border-sky-500/20', dot: 'bg-sky-400' },
  { chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-400' },
  { chip: 'bg-amber-500/10 text-amber-300 border-amber-500/20', dot: 'bg-amber-400' },
  { chip: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20', dot: 'bg-fuchsia-400' },
  { chip: 'bg-rose-500/10 text-rose-300 border-rose-500/20', dot: 'bg-rose-400' },
  { chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20', dot: 'bg-indigo-400' },
];

function hashKey(k) {
  let h = 0;
  for (let i = 0; i < (k || '').length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function siteStyle(key) {
  return PALETTE[hashKey(key) % PALETTE.length];
}

export function formatMs(ms) {
  if (!ms && ms !== 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}