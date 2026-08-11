/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only logic for voucher agents / resellers, commissions and payouts. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWriter } from "./network.server";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function makeCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "AGNT";
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function commissionFor(
  price: number,
  type: "percent" | "fixed",
  rate: number,
): number {
  const value = type === "percent" ? (price * rate) / 100 : rate;
  return Math.max(0, Math.round(value * 100) / 100);
}

/* --------------------------------- resellers -------------------------------- */

export async function fetchResellers(db: DB) {
  const resellers = unwrap(
    await db.from("resellers").select("*").order("created_at", { ascending: false }),
  ) as any[];
  const sales = unwrap(
    await db.from("reseller_sales").select("reseller_id, price_ssp, commission_ssp, settled"),
  ) as any[];
  const allocations = unwrap(
    await db.from("reseller_allocations").select("reseller_id, quantity"),
  ) as any[];

  return resellers.map((r) => {
    const mine = sales.filter((s) => s.reseller_id === r.id);
    const revenue = mine.reduce((a, s) => a + Number(s.price_ssp ?? 0), 0);
    const commission = mine.reduce((a, s) => a + Number(s.commission_ssp ?? 0), 0);
    const payable = mine
      .filter((s) => !s.settled)
      .reduce((a, s) => a + Number(s.commission_ssp ?? 0), 0);
    return {
      ...r,
      stats: {
        sales: mine.length,
        revenue,
        commission,
        payable,
        allocated: allocations
          .filter((a) => a.reseller_id === r.id)
          .reduce((a, x) => a + Number(x.quantity ?? 0), 0),
      },
    };
  });
}

export async function saveResellerRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) {
    return unwrap(await db.from("resellers").update(rest).eq("id", id).select().single());
  }
  return unwrap(
    await db
      .from("resellers")
      .insert({ ...rest, code: rest.code || makeCode(rest.full_name), created_by: userId })
      .select()
      .single(),
  );
}

export async function deleteResellerRecord(db: DB, userId: string, resellerId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("resellers").delete().eq("id", resellerId).select());
  return { ok: true };
}

/* -------------------------------- allocations ------------------------------- */

export async function allocateVouchersRecord(
  db: DB,
  userId: string,
  input: { resellerId: string; batchId: string; quantity: number; note?: string | null | undefined },
) {
  await assertWriter(db, userId);
  const available = unwrap(
    await db
      .from("vouchers")
      .select("id, package_id")
      .eq("batch_id", input.batchId)
      .is("reseller_id", null)
      .eq("state", "unused")
      .limit(input.quantity),
  ) as any[];
  if (available.length === 0) throw new Error("No unallocated vouchers left in that batch.");

  unwrap(
    await db
      .from("vouchers")
      .update({ reseller_id: input.resellerId })
      .in("id", available.map((v) => v.id))
      .select("id"),
  );

  const allocation = unwrap(
    await db
      .from("reseller_allocations")
      .insert({
        reseller_id: input.resellerId,
        batch_id: input.batchId,
        package_id: available[0]?.package_id ?? null,
        quantity: available.length,
        note: input.note ?? null,
        created_by: userId,
      })
      .select()
      .single(),
  );
  return { allocation, allocated: available.length };
}

export async function fetchAllocations(db: DB, resellerId?: string | null) {
  let q = db
    .from("reseller_allocations")
    .select("*, voucher_batches(name), hotspot_packages(name, price_ssp), resellers(full_name, code)")
    .order("created_at", { ascending: false });
  if (resellerId) q = q.eq("reseller_id", resellerId);
  return unwrap(await q);
}

/* ------------------------------ reseller portal ----------------------------- */

export async function fetchMyReseller(db: DB, userId: string) {
  const reseller = unwrap(
    await db.from("resellers").select("*").eq("user_id", userId).maybeSingle(),
  );
  if (!reseller) return { reseller: null };

  const inventory = unwrap(
    await db
      .from("vouchers")
      .select("id, code, state, price_ssp, expires_at, hotspot_packages(name, price_ssp)")
      .eq("reseller_id", reseller.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ) as any[];

  const sales = unwrap(
    await db
      .from("reseller_sales")
      .select("*, hotspot_packages(name), vouchers(code)")
      .eq("reseller_id", reseller.id)
      .order("sold_at", { ascending: false })
      .limit(300),
  ) as any[];

  const payouts = unwrap(
    await db
      .from("commission_payouts")
      .select("*")
      .eq("reseller_id", reseller.id)
      .order("created_at", { ascending: false }),
  ) as any[];

  const rules = unwrap(
    await db
      .from("reseller_commission_rules")
      .select("*, hotspot_packages(name)")
      .eq("reseller_id", reseller.id),
  ) as any[];

  const earned = sales.reduce((a, s) => a + Number(s.commission_ssp ?? 0), 0);
  const payable = sales
    .filter((s) => !s.settled)
    .reduce((a, s) => a + Number(s.commission_ssp ?? 0), 0);
  const revenue = sales.reduce((a, s) => a + Number(s.price_ssp ?? 0), 0);

  const byPackage = new Map<string, { name: string; count: number; revenue: number }>();
  for (const s of sales) {
    const name = s.hotspot_packages?.name ?? "Unknown";
    const cur = byPackage.get(name) ?? { name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(s.price_ssp ?? 0);
    byPackage.set(name, cur);
  }

  return {
    reseller,
    inventory,
    sales,
    payouts,
    rules,
    totals: { earned, payable, revenue, sold: sales.length, inStock: inventory.filter((v) => v.state === "unused").length },
    topProducts: [...byPackage.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

async function resolveCommission(db: DB, reseller: any, packageId: string | null, price: number) {
  if (packageId) {
    const rule = unwrap(
      await db
        .from("reseller_commission_rules")
        .select("commission_type, commission_rate")
        .eq("reseller_id", reseller.id)
        .eq("package_id", packageId)
        .maybeSingle(),
    );
    if (rule) return commissionFor(price, rule.commission_type, Number(rule.commission_rate));
  }
  return commissionFor(price, reseller.commission_type, Number(reseller.commission_rate));
}

/** An agent sells one of their allocated vouchers to a walk-in customer. */
export async function sellVoucherRecord(
  db: DB,
  userId: string,
  input: { voucherId: string; customerPhone?: string | null | undefined },
) {
  const reseller = unwrap(
    await db.from("resellers").select("*").eq("user_id", userId).maybeSingle(),
  );
  if (!reseller) throw new Error("No agent account is linked to this login.");
  if (reseller.status !== "active") throw new Error("This agent account is not active.");

  const voucher = unwrap(
    await db
      .from("vouchers")
      .select("id, code, state, price_ssp, package_id, reseller_id")
      .eq("id", input.voucherId)
      .single(),
  );
  if (voucher.reseller_id !== reseller.id) throw new Error("That voucher is not in your inventory.");
  if (voucher.state !== "unused") throw new Error("That voucher has already been sold.");

  const price = Number(voucher.price_ssp ?? 0);
  const commission = await resolveCommission(db, reseller, voucher.package_id, price);

  unwrap(
    await db
      .from("vouchers")
      .update({ state: "active", activated_at: new Date().toISOString(), phone: input.customerPhone ?? null })
      .eq("id", voucher.id)
      .select("id"),
  );

  const sale = unwrap(
    await db
      .from("reseller_sales")
      .insert({
        reseller_id: reseller.id,
        voucher_id: voucher.id,
        package_id: voucher.package_id,
        customer_phone: input.customerPhone ?? null,
        price_ssp: price,
        commission_ssp: commission,
      })
      .select()
      .single(),
  );

  return { sale, code: voucher.code, commission };
}

/* --------------------------------- payouts ---------------------------------- */

export async function requestPayoutRecord(
  db: DB,
  userId: string,
  input: { amount: number; method: string; destination?: string | null | undefined; note?: string | null | undefined },
) {
  const reseller = unwrap(
    await db.from("resellers").select("id").eq("user_id", userId).maybeSingle(),
  );
  if (!reseller) throw new Error("No agent account is linked to this login.");
  return unwrap(
    await db
      .from("commission_payouts")
      .insert({
        reseller_id: reseller.id,
        amount_ssp: input.amount,
        method: input.method,
        destination: input.destination ?? null,
        note: input.note ?? null,
      })
      .select()
      .single(),
  );
}

export async function fetchPayouts(db: DB) {
  return unwrap(
    await db
      .from("commission_payouts")
      .select("*, resellers(full_name, code, phone)")
      .order("created_at", { ascending: false }),
  );
}

export async function decidePayoutRecord(
  db: DB,
  userId: string,
  input: { payoutId: string; decision: "approved" | "rejected" | "paid"; reference?: string | null | undefined },
) {
  await assertWriter(db, userId);
  const payout = unwrap(
    await db.from("commission_payouts").select("*").eq("id", input.payoutId).single(),
  );
  const patch: any = {
    status: input.decision,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    reference: input.reference ?? payout.reference,
  };
  if (input.decision === "paid") {
    patch.paid_at = new Date().toISOString();
    const unsettled = unwrap(
      await db
        .from("reseller_sales")
        .select("id, commission_ssp")
        .eq("reseller_id", payout.reseller_id)
        .eq("settled", false)
        .order("sold_at", { ascending: true }),
    ) as any[];
    let remaining = Number(payout.amount_ssp);
    const ids: string[] = [];
    for (const s of unsettled) {
      if (remaining <= 0) break;
      ids.push(s.id);
      remaining -= Number(s.commission_ssp ?? 0);
    }
    if (ids.length > 0) {
      unwrap(
        await db
          .from("reseller_sales")
          .update({ settled: true, payout_id: payout.id })
          .in("id", ids)
          .select("id"),
      );
    }
  }
  return unwrap(
    await db.from("commission_payouts").update(patch).eq("id", input.payoutId).select().single(),
  );
}

export async function settleAllRecord(db: DB, userId: string, resellerId: string, method: string) {
  await assertWriter(db, userId);
  const unsettled = unwrap(
    await db
      .from("reseller_sales")
      .select("id, commission_ssp")
      .eq("reseller_id", resellerId)
      .eq("settled", false),
  ) as any[];
  const amount = unsettled.reduce((a, s) => a + Number(s.commission_ssp ?? 0), 0);
  if (amount <= 0) throw new Error("Nothing outstanding for this agent.");
  const payout = unwrap(
    await db
      .from("commission_payouts")
      .insert({
        reseller_id: resellerId,
        amount_ssp: amount,
        method,
        status: "paid",
        decided_by: userId,
        decided_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        note: "Bulk settlement",
      })
      .select()
      .single(),
  );
  unwrap(
    await db
      .from("reseller_sales")
      .update({ settled: true, payout_id: payout.id })
      .in("id", unsettled.map((s) => s.id))
      .select("id"),
  );
  return { payout, amount, count: unsettled.length };
}

/* ------------------------------ commission rules ---------------------------- */

export async function saveCommissionRuleRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  return unwrap(
    await db
      .from("reseller_commission_rules")
      .upsert(
        {
          reseller_id: input.resellerId,
          package_id: input.packageId,
          commission_type: input.commissionType,
          commission_rate: input.commissionRate,
        },
        { onConflict: "reseller_id,package_id" },
      )
      .select()
      .single(),
  );
}

export async function fetchCommissionRules(db: DB, resellerId: string) {
  return unwrap(
    await db
      .from("reseller_commission_rules")
      .select("*, hotspot_packages(name)")
      .eq("reseller_id", resellerId),
  );
}
