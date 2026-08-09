/** Shared display helpers. SOUK JUNUB reports exclusively in SSP. */

export const BASE_CURRENCY = "SSP";

export function formatSSP(amount: number | null | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `${BASE_CURRENCY} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUptime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatBps(bps: number | null | undefined): string {
  const v = typeof bps === "number" && Number.isFinite(bps) ? bps : 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} Gbps`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Mbps`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} kbps`;
  return `${v} bps`;
}

export function formatBytes(bytes: number | null | undefined): string {
  const v = typeof bytes === "number" && Number.isFinite(bytes) ? bytes : 0;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = v;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function isRouterOffline(
  lastSeenAt: string | null | undefined,
  thresholdSeconds: number,
): boolean {
  if (!lastSeenAt) return true;
  const then = new Date(lastSeenAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then > thresholdSeconds * 1000;
}

/** South Sudan telco detection from a local or +211 phone number. */
export function detectTelco(phone: string): "MTN" | "Zain" | "Digitel" | "Unknown" {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("211") ? digits.slice(3) : digits.replace(/^0/, "");
  if (/^92/.test(local)) return "MTN";
  if (/^99/.test(local)) return "Zain";
  if (/^98/.test(local)) return "Digitel";
  return "Unknown";
}
