/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only analytics & operational reporting (all money in SSP). */
import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const DAY = 86400000;

function dayKey(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}
function monthKey(d: Date | string) {
  return new Date(d).toISOString().slice(0, 7);
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

/** Everything the main real-time dashboard needs, in one round trip. */
export async function fetchAnalyticsDashboard(db: DB) {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since12m = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const today = startOfToday();
  const month = startOfMonth();

  const [payments, routers, hotspotUsers, pppoeSubs, vouchers, metrics, sessions] =
    await Promise.all([
      db
        .from("payments")
        .select("id, reference, provider, msisdn, amount_ssp, status, created_at, paid_at, package_id, hotspot_packages(name)")
        .gte("created_at", since12m.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      db.from("routers").select("id, name, status, active_users, cpu_load, last_seen_at, latency_ms"),
      db
        .from("hotspot_users")
        .select("id, username, full_name, phone, status, is_online, data_used_mb, expires_at, last_seen_at"),
      db
        .from("pppoe_subscribers")
        .select("id, username, full_name, phone, status, is_online, expires_at, last_seen_at"),
      db.from("vouchers").select("id, state, price_ssp, data_used_mb, created_at, used_at, activated_at"),
      db
        .from("router_metrics")
        .select("router_id, recorded_at, rx_bps, tx_bps, active_users")
        .gte("recorded_at", new Date(now.getTime() - 7 * DAY).toISOString())
        .order("recorded_at", { ascending: true })
        .limit(5000),
      db
        .from("hotspot_sessions")
        .select("id, username, rx_bytes, tx_bytes, started_at, is_active")
        .gte("started_at", since30.toISOString())
        .limit(5000),
    ]).then((r) => r.map(unwrap)) as any;

  const success = payments.filter((p: any) => p.status === "success");
  const sum = (rows: any[]) => rows.reduce((a, p) => a + Number(p.amount_ssp ?? 0), 0);

  // ---- KPI cards
  const revenueToday = sum(success.filter((p: any) => new Date(p.created_at) >= today));
  const revenueMonth = sum(success.filter((p: any) => new Date(p.created_at) >= month));
  const onlineNow =
    hotspotUsers.filter((u: any) => u.is_online).length +
    pppoeSubs.filter((s: any) => s.is_online).length;
  const activeUsers =
    hotspotUsers.filter((u: any) => u.status === "active").length +
    pppoeSubs.filter((s: any) => s.status === "active").length;
  const expiredToday = [...hotspotUsers, ...pppoeSubs].filter(
    (u: any) => u.expires_at && new Date(u.expires_at) >= today && new Date(u.expires_at) <= now,
  ).length;
  const offlineButActive =
    hotspotUsers.filter((u: any) => u.status === "active" && !u.is_online).length +
    pppoeSubs.filter((s: any) => s.status === "active" && !s.is_online).length;
  const vouchersSoldToday = vouchers.filter(
    (v: any) => v.used_at && new Date(v.used_at) >= today,
  ).length;

  // ---- Daily revenue, last 30 days
  const dailyRevenue: { date: string; revenue: number; count: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const rows = success.filter((p: any) => dayKey(p.created_at) === key);
    dailyRevenue.push({ date: key, revenue: sum(rows), count: rows.length });
  }

  // ---- Monthly sales, last 12 months
  const monthlySales: { month: string; revenue: number; count: number }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const rows = success.filter((p: any) => monthKey(p.created_at) === key);
    monthlySales.push({ month: key, revenue: sum(rows), count: rows.length });
  }

  // ---- Package popularity
  const pkg = new Map<string, { name: string; count: number; revenue: number }>();
  for (const p of success) {
    const name = p.hotspot_packages?.name ?? "Other / PPPoE";
    const cur = pkg.get(name) ?? { name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(p.amount_ssp ?? 0);
    pkg.set(name, cur);
  }
  const packagePopularity = [...pkg.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // ---- Router load distribution + status grid
  const routerLoad = routers
    .map((r: any) => ({
      name: r.name,
      users: r.active_users ?? 0,
      cpu: Number(r.cpu_load ?? 0),
    }))
    .sort((a: any, b: any) => b.users - a.users);

  // ---- Data usage trend (last 7 days from sessions)
  const usageTrend: { date: string; gb: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const bytes = sessions
      .filter((s: any) => dayKey(s.started_at) === key)
      .reduce((a: number, s: any) => a + Number(s.rx_bytes ?? 0) + Number(s.tx_bytes ?? 0), 0);
    usageTrend.push({ date: key, gb: Number((bytes / 1024 ** 3).toFixed(2)) });
  }

  // ---- Peak hours (session starts by hour of day)
  const peakHours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    sessions: sessions.filter((s: any) => new Date(s.started_at).getHours() === h).length,
  }));

  // ---- Heavy users
  const topDownloaders = [...hotspotUsers]
    .map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.full_name,
      phone: u.phone,
      mb: Number(u.data_used_mb ?? 0),
      online: !!u.is_online,
    }))
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 10);

  const avgMb =
    topDownloaders.length && hotspotUsers.length
      ? hotspotUsers.reduce((a: number, u: any) => a + Number(u.data_used_mb ?? 0), 0) /
        hotspotUsers.length
      : 0;
  const abusive = topDownloaders.filter((u) => avgMb > 0 && u.mb > avgMb * 4);

  const throughput = metrics.length
    ? metrics.slice(-60).map((m: any) => ({
        at: m.recorded_at,
        rx: Number(m.rx_bps ?? 0),
        tx: Number(m.tx_bps ?? 0),
      }))
    : [];

  return {
    kpis: {
      revenueToday,
      revenueMonth,
      activeUsers,
      expiredToday,
      onlineNow,
      offlineButActive,
      routersOnline: routers.filter((r: any) => r.status === "online").length,
      routersTotal: routers.length,
      vouchersSoldToday,
    },
    dailyRevenue,
    monthlySales,
    packagePopularity,
    routerLoad,
    usageTrend,
    peakHours,
    topDownloaders,
    abusive,
    throughput,
    routers,
    recentTransactions: payments.slice(0, 20),
  };
}

/** Operational reports with a custom date range. */
export async function fetchOperationalReports(
  db: DB,
  input: { from?: string | null | undefined; to?: string | null | undefined },
) {
  const from = input.from ? new Date(`${input.from}T00:00:00.000Z`) : new Date(Date.now() - 30 * DAY);
  const to = input.to ? new Date(`${input.to}T23:59:59.999Z`) : new Date();
  const in7 = new Date(Date.now() + 7 * DAY);

  const [activations, hsExpiring, pppoeExpiring, routers, tickets, sales, ads, vouchers] =
    await Promise.all([
      db
        .from("customers")
        .select("id, full_name, phone, area, customer_type, status, created_at")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("hotspot_users")
        .select("id, username, full_name, phone, expires_at, status")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .lte("expires_at", in7.toISOString())
        .order("expires_at", { ascending: true }),
      db
        .from("pppoe_subscribers")
        .select("id, username, full_name, phone, expires_at, status")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .lte("expires_at", in7.toISOString())
        .order("expires_at", { ascending: true }),
      db.from("routers").select("id, name, status, last_seen_at, uptime_seconds, latency_ms, packet_loss_pct"),
      db
        .from("support_tickets")
        .select("id, ticket_number, subject, category, priority, status, created_at, first_response_at, resolved_at, sla_due_at")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(1000),
      db
        .from("reseller_sales")
        .select("id, price_ssp, commission_ssp, settled, sold_at, resellers(code, full_name, tier)")
        .gte("sold_at", from.toISOString())
        .lte("sold_at", to.toISOString())
        .limit(2000),
      db.from("portal_ads").select("id, title, kind, impressions, clicks, is_active"),
      db
        .from("vouchers")
        .select("id, code, state, price_ssp, data_used_mb, minutes_used, created_at, used_at, hotspot_packages(name, data_cap_mb, duration_minutes)")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000),
    ]).then((r) => r.map(unwrap)) as any;

  const resolved = tickets.filter((t: any) => t.resolved_at);
  const avgResolutionHours = resolved.length
    ? resolved.reduce(
        (a: number, t: any) =>
          a + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000,
        0,
      ) / resolved.length
    : 0;
  const slaBreached = tickets.filter(
    (t: any) =>
      t.sla_due_at &&
      new Date(t.sla_due_at) < new Date(t.resolved_at ?? Date.now()),
  ).length;

  const agentMap = new Map<string, { agent: string; tier: string; sales: number; revenue: number; commission: number; unsettled: number }>();
  for (const s of sales) {
    const key = s.resellers?.code ?? "unknown";
    const cur =
      agentMap.get(key) ??
      { agent: `${s.resellers?.code ?? "—"} · ${s.resellers?.full_name ?? "Unknown"}`, tier: s.resellers?.tier ?? "—", sales: 0, revenue: 0, commission: 0, unsettled: 0 };
    cur.sales += 1;
    cur.revenue += Number(s.price_ssp ?? 0);
    cur.commission += Number(s.commission_ssp ?? 0);
    if (!s.settled) cur.unsettled += Number(s.commission_ssp ?? 0);
    agentMap.set(key, cur);
  }

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    activations,
    expiring: [
      ...hsExpiring.map((u: any) => ({ ...u, kind: "hotspot" })),
      ...pppoeExpiring.map((u: any) => ({ ...u, kind: "pppoe" })),
    ].sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()),
    routers,
    tickets: {
      rows: tickets,
      total: tickets.length,
      resolved: resolved.length,
      open: tickets.filter((t: any) => !t.resolved_at).length,
      avgResolutionHours: Number(avgResolutionHours.toFixed(1)),
      slaBreached,
    },
    agentSales: [...agentMap.values()].sort((a, b) => b.revenue - a.revenue),
    ads: ads
      .map((a: any) => ({
        ...a,
        ctr: Number(a.impressions) > 0 ? (Number(a.clicks) / Number(a.impressions)) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.impressions - a.impressions),
    vouchers,
  };
}
