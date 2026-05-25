export const fmtUsd = (n: number, digits = 2) =>
  "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtNum = (n: number, digits = 0) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtAsh = (n: number) => fmtNum(n) + " ASH";
export const pct = (n: number, digits = 1) => (n * 100).toFixed(digits) + "%";

export function timeAgo(ts: number | string) {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export function countdown(target: string | number) {
  const ms = (typeof target === "number" ? target : new Date(target).getTime()) - Date.now();
  if (ms <= 0) return "—";
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
