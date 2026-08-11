/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only financial reporting, invoicing and gateway configuration (SSP). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWriter } from "./network.server";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function startOf(period: "today" | "week" | "month" | "year"): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - d.getDay());
  if (period === "month") d.setDate(1);
  if (period === "year") {
    d.setMonth(0);
    d.setDate(1);
  }
  return d;
}

export async function fetchFinanceReport(
  db: DB,
  input: { from?: string | null; to?: string | null },
) {
  const from = input.from ? new Date(`${input.from}T00:00:00.000Z`) : startOf("month");
  const to = input.to ? new Date(`${input.to}T23:59:59.999Z`) : new Date();

  const payments = unwrap(
    await db
      .from("payments")
      .select(
        "id, reference, provider, msisdn, amount_ssp, status, receipt_number, created_at, paid_at, package_id, hotspot_packages(name), vouchers(router_id), pppoe_subscriber_id",
      )
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000),
  ) as any[];

  const all = unwrap(
    await db.from("payments").select("amount_ssp, status, created_at").eq("status", "success"),
  ) as any[];

  const sumSince = (d: Date) =>
    all
      .filter((p) => new Date(p.created_at) >= d)
      .reduce((a, p) => a + Number(p.amount_ssp ?? 0), 0);

  const success = payments.filter((p) => p.status === "success");
  const total = success.reduce((a, p) => a + Number(p.amount_ssp ?? 0), 0);

  const byProvider = new Map<string, { provider: string; count: number; total: number }>();
  for (const p of success) {
    const cur = byProvider.get(p.provider) ?? { provider: p.provider, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(p.amount_ssp ?? 0);
    byProvider.set(p.provider, cur);
  }

  const byPackage = new Map<string, { name: string; count: number; total: number }>();
  for (const p of success) {
    const name = p.hotspot_packages?.name ?? "Other / PPPoE";
    const cur = byPackage.get(name) ?? { name, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(p.amount_ssp ?? 0);
    byPackage.set(name, cur);
  }

  // Revenue per router, via the voucher that the payment issued.
  const routers = unwrap(await db.from("routers").select("id, name")) as any[];
  const routerName = new Map(routers.map((r) => [r.id, r.name]));
  const byRouter = new Map<string, { name: string; count: number; total: number }>();
  for (const p of success) {
    const rid = p.vouchers?.router_id ?? null;
    const name = rid ? (routerName.get(rid) ?? "Unknown router") : "Unassigned";
    const cur = byRouter.get(name) ?? { name, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(p.amount_ssp ?? 0);
    byRouter.set(name, cur);
  }

  const invoices = unwrap(
    await db
      .from("pppoe_invoices")
      .select("id, invoice_number, amount_ssp, static_ip_fee_ssp, status, due_at, pppoe_subscribers(username, full_name, phone)")
      .neq("status", "paid")
      .order("due_at", { ascending: true })
      .limit(300),
  ) as any[];

  const outstanding = invoices.reduce(
    (a, i) => a + Number(i.amount_ssp ?? 0) + Number(i.static_ip_fee_ssp ?? 0),
    0,
  );

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    payments,
    totals: {
      total,
      count: success.length,
      failed: payments.filter((p) => p.status === "failed").length,
      today: sumSince(startOf("today")),
      week: sumSince(startOf("week")),
      month: sumSince(startOf("month")),
      year: sumSince(startOf("year")),
      outstanding,
    },
    byProvider: [...byProvider.values()].sort((a, b) => b.total - a.total),
    byPackage: [...byPackage.values()].sort((a, b) => b.total - a.total),
    byRouter: [...byRouter.values()].sort((a, b) => b.total - a.total),
    invoices,
  };
}

/** Raise invoices for every active postpaid PPPoE subscriber for the current cycle. */
export async function generateInvoicesRecord(db: DB, userId: string) {
  await assertWriter(db, userId);
  const subs = unwrap(
    await db
      .from("pppoe_subscribers")
      .select("id, username, plan_id, pppoe_plans(price_ssp, billing_type, billing_cycle)")
      .eq("status", "active"),
  ) as any[];

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const created: any[] = [];
  for (const s of subs) {
    const plan = s.pppoe_plans;
    if (!plan || plan.billing_type !== "postpaid") continue;

    const existing = unwrap(
      await db
        .from("pppoe_invoices")
        .select("id")
        .eq("subscriber_id", s.id)
        .gte("period_start", periodStart.toISOString())
        .maybeSingle(),
    );
    if (existing) continue;

    const ips = unwrap(
      await db
        .from("static_ip_allocations")
        .select("monthly_fee_ssp")
        .eq("subscriber_id", s.id)
        .eq("status", "assigned"),
    ) as any[];
    const ipFee = ips.reduce((a, i) => a + Number(i.monthly_fee_ssp ?? 0), 0);

    const invoice = unwrap(
      await db
        .from("pppoe_invoices")
        .insert({
          invoice_number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${s.username.slice(0, 8).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
          subscriber_id: s.id,
          plan_id: s.plan_id,
          amount_ssp: Number(plan.price_ssp ?? 0),
          static_ip_fee_ssp: ipFee,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          due_at: new Date(periodEnd.getTime() + 7 * 86400000).toISOString(),
          status: "unpaid",
        })
        .select()
        .single(),
    );
    created.push(invoice);
  }
  return { created: created.length, invoices: created };
}

/* --------------------------------- gateways --------------------------------- */

export async function fetchGateways(db: DB) {
  return unwrap(
    await db.from("payment_gateways").select("*").order("provider", { ascending: true }),
  );
}

export async function saveGatewayRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const patch: any = {
    environment: input.environment,
    phone_prefix: input.phonePrefix ?? null,
    callback_url: input.callbackUrl ?? null,
    config: input.config ?? {},
    is_active: input.isActive,
  };
  if (input.isDefault) {
    unwrap(await db.from("payment_gateways").update({ is_default: false }).neq("id", input.id).select("id"));
    patch.is_default = true;
  }
  return unwrap(
    await db.from("payment_gateways").update(patch).eq("id", input.id).select().single(),
  );
}
