/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only helpers for hotspot packages, vouchers, users, portal and SSP payments. */
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWriter } from "./network.server";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeVoucherCode(format: "grouped" | "alnum", length: number, prefix?: string | null) {
  const size = format === "grouped" ? 12 : Math.min(Math.max(length, 6), 20);
  let raw = "";
  for (let i = 0; i < size; i += 1) raw += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  const body = format === "grouped" ? raw.replace(/(.{4})(?=.)/g, "$1-") : raw;
  return prefix ? `${prefix.toUpperCase()}-${body}` : body;
}

/* ---------------------------------- packages --------------------------------- */

export async function fetchPackages(db: DB) {
  return unwrap(
    await db
      .from("hotspot_packages")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

export async function savePackageRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  const payload = { ...rest, created_by: userId };
  if (id) {
    return unwrap(await db.from("hotspot_packages").update(rest).eq("id", id).select().single());
  }
  return unwrap(await db.from("hotspot_packages").insert(payload).select().single());
}

export async function deletePackageRecord(db: DB, userId: string, packageId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("hotspot_packages").delete().eq("id", packageId).select());
  return { ok: true };
}

/* ---------------------------------- vouchers --------------------------------- */

export async function fetchVoucherBatches(db: DB) {
  const batches = unwrap(
    await db
      .from("voucher_batches")
      .select("*, hotspot_packages(name, price_ssp), sites(name)")
      .order("created_at", { ascending: false }),
  );
  const stats = unwrap(await db.from("vouchers").select("batch_id, state"));
  const byBatch = new Map<string, { unused: number; active: number; used: number; expired: number }>();
  for (const v of stats as any[]) {
    if (!v.batch_id) continue;
    const cur = byBatch.get(v.batch_id) ?? { unused: 0, active: 0, used: 0, expired: 0 };
    (cur as any)[v.state] = ((cur as any)[v.state] ?? 0) + 1;
    byBatch.set(v.batch_id, cur);
  }
  return (batches as any[]).map((b) => ({
    ...b,
    stats: byBatch.get(b.id) ?? { unused: 0, active: 0, used: 0, expired: 0 },
  }));
}

export async function generateVoucherBatch(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const pkg = unwrap(
    await db.from("hotspot_packages").select("id, price_ssp").eq("id", input.packageId).single(),
  );
  const batch = unwrap(
    await db
      .from("voucher_batches")
      .insert({
        name: input.name,
        package_id: input.packageId,
        site_id: input.siteId ?? null,
        quantity: input.quantity,
        code_format: input.codeFormat,
        code_length: input.codeLength,
        prefix: input.prefix ?? null,
        expires_at: input.expiresAt ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select()
      .single(),
  );

  const seen = new Set<string>();
  const rows: any[] = [];
  while (rows.length < input.quantity) {
    const code = makeVoucherCode(input.codeFormat, input.codeLength, input.prefix);
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code,
      batch_id: batch.id,
      package_id: pkg.id,
      price_ssp: pkg.price_ssp,
      expires_at: input.expiresAt ?? null,
      state: "unused",
    });
  }

  for (let i = 0; i < rows.length; i += 500) {
    unwrap(await db.from("vouchers").insert(rows.slice(i, i + 500)).select("id"));
  }
  return { batchId: batch.id, created: rows.length };
}

export async function fetchBatchVouchers(db: DB, batchId: string) {
  const batch = unwrap(
    await db
      .from("voucher_batches")
      .select("*, hotspot_packages(*), sites(name)")
      .eq("id", batchId)
      .single(),
  );
  const vouchers = unwrap(
    await db.from("vouchers").select("*").eq("batch_id", batchId).order("created_at"),
  );
  return { batch, vouchers };
}

export async function updateVoucherRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const patch: any = {};
  if (input.state) patch.state = input.state;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  return unwrap(await db.from("vouchers").update(patch).eq("id", input.voucherId).select().single());
}

export async function activateVoucherManually(db: DB, userId: string, code: string) {
  await assertWriter(db, userId);
  const voucher = unwrap(
    await db.from("vouchers").select("*, hotspot_packages(*)").eq("code", code.trim().toUpperCase()).maybeSingle(),
  );
  if (!voucher) throw new Error("Voucher code not found.");
  if (voucher.state !== "unused") throw new Error(`Voucher is already ${voucher.state}.`);
  const pkg = voucher.hotspot_packages;
  const now = new Date();
  const expiry = new Date(
    now.getTime() +
      (pkg?.duration_minutes ? pkg.duration_minutes * 60_000 : (pkg?.validity_days ?? 1) * 86_400_000),
  );
  return unwrap(
    await db
      .from("vouchers")
      .update({ state: "active", activated_at: now.toISOString(), expires_at: expiry.toISOString() })
      .eq("id", voucher.id)
      .select()
      .single(),
  );
}

/* -------------------------------- hotspot users ------------------------------- */

export async function fetchHotspotUsers(db: DB) {
  const users = unwrap(
    await db
      .from("hotspot_users")
      .select("*, hotspot_packages(name, price_ssp, data_cap_mb), routers(name)")
      .order("created_at", { ascending: false })
      .limit(500),
  );
  const sessions = unwrap(
    await db
      .from("hotspot_sessions")
      .select("*, routers(name)")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(200),
  );
  return { users, sessions };
}

export async function bulkUserAction(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const ids: string[] = input.userIds;
  if (!ids.length) throw new Error("Select at least one user.");

  if (input.action === "suspend" || input.action === "unsuspend") {
    unwrap(
      await db
        .from("hotspot_users")
        .update({ status: input.action === "suspend" ? "suspended" : "active" })
        .in("id", ids)
        .select("id"),
    );
    return { ok: true, affected: ids.length };
  }

  if (input.action === "change_package") {
    if (!input.packageId) throw new Error("Choose a package.");
    unwrap(await db.from("hotspot_users").update({ package_id: input.packageId }).in("id", ids).select("id"));
    return { ok: true, affected: ids.length };
  }

  if (input.action === "extend") {
    const days = Number(input.days ?? 1);
    const rows = unwrap(await db.from("hotspot_users").select("id, expires_at").in("id", ids));
    for (const row of rows as any[]) {
      const base = row.expires_at && new Date(row.expires_at) > new Date() ? new Date(row.expires_at) : new Date();
      const next = new Date(base.getTime() + days * 86_400_000).toISOString();
      unwrap(
        await db.from("hotspot_users").update({ expires_at: next, status: "active" }).eq("id", row.id).select("id"),
      );
    }
    return { ok: true, affected: ids.length };
  }

  if (input.action === "disconnect") {
    unwrap(
      await db
        .from("hotspot_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .in("hotspot_user_id", ids)
        .eq("is_active", true)
        .select("id"),
    );
    unwrap(await db.from("hotspot_users").update({ is_online: false }).in("id", ids).select("id"));
    return { ok: true, affected: ids.length };
  }

  throw new Error("Unknown action.");
}

/* ----------------------------------- portal ---------------------------------- */

export async function fetchPortal(db: DB) {
  const portals = unwrap(await db.from("portal_settings").select("*").order("created_at"));
  const ads = unwrap(await db.from("portal_ads").select("*").order("created_at", { ascending: false }));
  return { portals, ads };
}

export async function savePortalRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) return unwrap(await db.from("portal_settings").update(rest).eq("id", id).select().single());
  return unwrap(await db.from("portal_settings").insert(rest).select().single());
}

export async function saveAdRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) return unwrap(await db.from("portal_ads").update(rest).eq("id", id).select().single());
  return unwrap(await db.from("portal_ads").insert(rest).select().single());
}

export async function deleteAdRecord(db: DB, userId: string, adId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("portal_ads").delete().eq("id", adId).select());
  return { ok: true };
}

/* ---------------------------------- payments ---------------------------------- */

export async function fetchPayments(db: DB) {
  const payments = unwrap(
    await db
      .from("payments")
      .select("*, hotspot_packages(name), vouchers(code)")
      .order("created_at", { ascending: false })
      .limit(300),
  );
  return payments;
}

function receiptNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SJ-${stamp}-${randomInt(100000, 999999)}`;
}

export async function recordPaymentRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const pkg = input.packageId
    ? unwrap(await db.from("hotspot_packages").select("*").eq("id", input.packageId).single())
    : null;

  const isCash = input.provider === "cash";
  const status = isCash ? "success" : "pending";
  const reference = `PAY-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`;

  const payment = unwrap(
    await db
      .from("payments")
      .insert({
        reference,
        provider: input.provider,
        msisdn: input.msisdn ?? null,
        amount_ssp: input.amountSsp ?? pkg?.price_ssp ?? 0,
        status,
        package_id: input.packageId ?? null,
        recorded_by: userId,
        receipt_number: isCash ? receiptNumber() : null,
        paid_at: isCash ? new Date().toISOString() : null,
        metadata: { note: input.note ?? null },
      })
      .select()
      .single(),
  );

  // Successful payments deliver a voucher automatically.
  if (status === "success" && pkg) {
    const code = makeVoucherCode("grouped", 12, null);
    const voucher = unwrap(
      await db
        .from("vouchers")
        .insert({
          code,
          package_id: pkg.id,
          price_ssp: pkg.price_ssp,
          state: "unused",
          phone: input.msisdn ?? null,
        })
        .select()
        .single(),
    );
    unwrap(await db.from("payments").update({ voucher_id: voucher.id }).eq("id", payment.id).select("id"));
    return { payment, voucher };
  }

  return { payment, voucher: null };
}

export async function settlePaymentRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const payment = unwrap(await db.from("payments").select("*").eq("id", input.paymentId).single());

  if (input.outcome === "failed") {
    return unwrap(
      await db
        .from("payments")
        .update({ status: "failed", failure_reason: input.reason ?? "Provider declined" })
        .eq("id", payment.id)
        .select()
        .single(),
    );
  }

  if (input.outcome === "retry") {
    return unwrap(
      await db
        .from("payments")
        .update({ status: "pending", retry_count: (payment.retry_count ?? 0) + 1, failure_reason: null })
        .eq("id", payment.id)
        .select()
        .single(),
    );
  }

  // success
  let voucherId = payment.voucher_id;
  if (!voucherId && payment.package_id) {
    const pkg = unwrap(await db.from("hotspot_packages").select("*").eq("id", payment.package_id).single());
    const voucher = unwrap(
      await db
        .from("vouchers")
        .insert({
          code: makeVoucherCode("grouped", 12, null),
          package_id: pkg.id,
          price_ssp: pkg.price_ssp,
          state: "unused",
          phone: payment.msisdn,
        })
        .select()
        .single(),
    );
    voucherId = voucher.id;
  }

  return unwrap(
    await db
      .from("payments")
      .update({
        status: "success",
        paid_at: new Date().toISOString(),
        receipt_number: payment.receipt_number ?? receiptNumber(),
        voucher_id: voucherId,
      })
      .eq("id", payment.id)
      .select()
      .single(),
  );
}

export async function fetchReconciliation(db: DB, day: string) {
  const start = new Date(`${day}T00:00:00.000Z`).toISOString();
  const end = new Date(new Date(start).getTime() + 86_400_000).toISOString();
  const rows = unwrap(
    await db
      .from("payments")
      .select("provider, status, amount_ssp, created_at")
      .gte("created_at", start)
      .lt("created_at", end),
  );
  const summary = new Map<string, { provider: string; count: number; success: number; failed: number; total: number }>();
  for (const r of rows as any[]) {
    const cur = summary.get(r.provider) ?? { provider: r.provider, count: 0, success: 0, failed: 0, total: 0 };
    cur.count += 1;
    if (r.status === "success") {
      cur.success += 1;
      cur.total += Number(r.amount_ssp ?? 0);
    }
    if (r.status === "failed") cur.failed += 1;
    summary.set(r.provider, cur);
  }
  return { day, rows: Array.from(summary.values()) };
}
