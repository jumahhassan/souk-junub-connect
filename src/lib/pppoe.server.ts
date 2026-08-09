/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only helpers for PPPoE plans, subscribers, sessions, static IPs and invoices. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWriter } from "./network.server";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export const BILLING_CYCLE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

export function addCycle(from: Date, cycle: string): Date {
  const days = BILLING_CYCLE_DAYS[cycle] ?? 30;
  return new Date(from.getTime() + days * 86400_000);
}

/* ------------------------------------ plans ----------------------------------- */

export async function fetchPppoePlans(db: DB) {
  const plans = unwrap(
    await db.from("pppoe_plans").select("*").order("sort_order").order("created_at"),
  );
  const counts = unwrap(await db.from("pppoe_subscribers").select("plan_id"));
  const byPlan = new Map<string, number>();
  for (const row of counts as any[]) {
    if (!row.plan_id) continue;
    byPlan.set(row.plan_id, (byPlan.get(row.plan_id) ?? 0) + 1);
  }
  return (plans as any[]).map((p) => ({ ...p, subscriber_count: byPlan.get(p.id) ?? 0 }));
}

export async function savePppoePlanRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) {
    return unwrap(await db.from("pppoe_plans").update(rest).eq("id", id).select().single());
  }
  return unwrap(
    await db
      .from("pppoe_plans")
      .insert({ ...rest, created_by: userId })
      .select()
      .single(),
  );
}

export async function deletePppoePlanRecord(db: DB, userId: string, planId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("pppoe_plans").delete().eq("id", planId).select());
  return { ok: true };
}

/* --------------------------------- subscribers -------------------------------- */

export async function fetchSubscribers(db: DB) {
  const subscribers = unwrap(
    await db
      .from("pppoe_subscribers")
      .select("*, pppoe_plans(name, price_ssp, billing_cycle, billing_type), routers(name), sites(name)")
      .order("created_at", { ascending: false })
      .limit(1000),
  );
  const plans = unwrap(
    await db
      .from("pppoe_plans")
      .select("id, name, price_ssp, billing_cycle, billing_type, profile_name")
      .eq("is_active", true)
      .order("sort_order"),
  );
  const routers = unwrap(await db.from("routers").select("id, name").order("name"));
  const sites = unwrap(await db.from("sites").select("id, name").order("name"));
  return { subscribers, plans, routers, sites };
}

export async function fetchSubscriberDetail(db: DB, subscriberId: string) {
  const subscriber = unwrap(
    await db
      .from("pppoe_subscribers")
      .select("*, pppoe_plans(*), routers(name), sites(name)")
      .eq("id", subscriberId)
      .maybeSingle(),
  );
  if (!subscriber) throw new Error("Subscriber not found");
  const sessions = unwrap(
    await db
      .from("pppoe_sessions")
      .select("*")
      .eq("subscriber_id", subscriberId)
      .order("started_at", { ascending: false })
      .limit(50),
  );
  const invoices = unwrap(
    await db
      .from("pppoe_invoices")
      .select("*")
      .eq("subscriber_id", subscriberId)
      .order("created_at", { ascending: false })
      .limit(24),
  );
  const staticIps = unwrap(
    await db.from("static_ip_allocations").select("*").eq("subscriber_id", subscriberId),
  );
  return { subscriber, sessions, invoices, staticIps };
}

export async function saveSubscriberRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) {
    return unwrap(await db.from("pppoe_subscribers").update(rest).eq("id", id).select().single());
  }
  return unwrap(
    await db
      .from("pppoe_subscribers")
      .insert({ ...rest, created_by: userId })
      .select()
      .single(),
  );
}

export async function deleteSubscriberRecord(db: DB, userId: string, subscriberId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("pppoe_subscribers").delete().eq("id", subscriberId).select());
  return { ok: true };
}

export async function importSubscribersRecord(
  db: DB,
  userId: string,
  input: { rows: any[]; routerId: string | null; siteId: string | null },
) {
  await assertWriter(db, userId);
  const plans = unwrap(await db.from("pppoe_plans").select("id, name"));
  const planByName = new Map(
    (plans as any[]).map((p) => [String(p.name).trim().toLowerCase(), p.id as string]),
  );

  const payload: any[] = [];
  const skipped: string[] = [];
  for (const row of input.rows) {
    const username = String(row.username ?? "").trim();
    if (!username) continue;
    const planId = row.plan ? planByName.get(String(row.plan).trim().toLowerCase()) ?? null : null;
    if (row.plan && !planId) skipped.push(`${username}: unknown plan "${row.plan}"`);
    payload.push({
      username,
      password: String(row.password ?? "").trim() || username,
      full_name: row.full_name ? String(row.full_name).trim() : null,
      phone: row.phone ? String(row.phone).trim() : null,
      caller_id: row.caller_id ? String(row.caller_id).trim() : null,
      remote_address: row.remote_address ? String(row.remote_address).trim() : null,
      comment: row.comment ? String(row.comment).trim() : null,
      plan_id: planId,
      router_id: input.routerId,
      site_id: input.siteId,
      status: "active",
      created_by: userId,
    });
  }

  let inserted = 0;
  const failed: string[] = [];
  for (const record of payload) {
    const { error } = await db.from("pppoe_subscribers").insert(record);
    if (error) failed.push(`${record.username}: ${error.message}`);
    else inserted += 1;
  }
  return { inserted, failed, skipped };
}

export async function transferSubscribersRecord(
  db: DB,
  userId: string,
  input: {
    subscriberIds: string[];
    targetRouterId: string;
    planMap: { fromPlanId: string; toPlanId: string }[];
  },
) {
  await assertWriter(db, userId);
  const rows = unwrap(
    await db.from("pppoe_subscribers").select("id, plan_id").in("id", input.subscriberIds),
  );
  const map = new Map(input.planMap.map((m) => [m.fromPlanId, m.toPlanId]));
  let moved = 0;
  for (const row of rows as any[]) {
    const nextPlan = row.plan_id ? map.get(row.plan_id) ?? row.plan_id : row.plan_id;
    const { error } = await db
      .from("pppoe_subscribers")
      .update({ router_id: input.targetRouterId, plan_id: nextPlan })
      .eq("id", row.id);
    if (!error) moved += 1;
  }
  await db.from("audit_log").insert({
    actor_id: userId,
    action: "pppoe.bulk_transfer",
    entity: "pppoe_subscribers",
    entity_id: input.targetRouterId,
    metadata: { moved },
  });
  return { moved };
}

export async function setSubscriberStatusRecord(
  db: DB,
  userId: string,
  input: { subscriberIds: string[]; status: string },
) {
  await assertWriter(db, userId);
  unwrap(
    await db
      .from("pppoe_subscribers")
      .update({ status: input.status, ...(input.status === "disabled" ? { is_online: false } : {}) })
      .in("id", input.subscriberIds)
      .select("id"),
  );
  return { ok: true, count: input.subscriberIds.length };
}

/** Extend a subscription by one billing cycle and queue the router-side enable. */
export async function renewSubscriberRecord(
  db: DB,
  userId: string | null,
  input: {
    subscriberId: string;
    cycles: number;
    amountSsp?: number | null | undefined;
    provider?: string | undefined;
    reference?: string | null | undefined;
  },
) {
  if (userId) await assertWriter(db, userId);
  const subscriber = unwrap(
    await db
      .from("pppoe_subscribers")
      .select("*, pppoe_plans(id, name, price_ssp, billing_cycle)")
      .eq("id", input.subscriberId)
      .maybeSingle(),
  );
  if (!subscriber) throw new Error("Subscriber not found");

  const plan = subscriber.pppoe_plans;
  const cycle = plan?.billing_cycle ?? "monthly";
  const now = new Date();
  const base =
    subscriber.expires_at && new Date(subscriber.expires_at) > now
      ? new Date(subscriber.expires_at)
      : now;
  let expires = base;
  for (let i = 0; i < Math.max(1, input.cycles); i += 1) expires = addCycle(expires, cycle);

  const amount = input.amountSsp ?? Number(plan?.price_ssp ?? 0) * Math.max(1, input.cycles);

  unwrap(
    await db
      .from("pppoe_subscribers")
      .update({
        status: "active",
        expires_at: expires.toISOString(),
        activated_at: subscriber.activated_at ?? now.toISOString(),
      })
      .eq("id", subscriber.id)
      .select("id")
      .single(),
  );

  const invoiceNumber = `PPP-${Date.now().toString(36).toUpperCase()}`;
  const invoice = unwrap(
    await db
      .from("pppoe_invoices")
      .insert({
        invoice_number: invoiceNumber,
        subscriber_id: subscriber.id,
        plan_id: plan?.id ?? null,
        amount_ssp: amount,
        period_start: base.toISOString(),
        period_end: expires.toISOString(),
        due_at: now.toISOString(),
        status: "paid",
        paid_at: now.toISOString(),
      })
      .select()
      .single(),
  );

  await db.from("payments").insert({
    reference: input.reference ?? `RNW-${invoiceNumber}`,
    provider: input.provider ?? "cash",
    msisdn: subscriber.phone,
    amount_ssp: amount,
    status: "completed",
    pppoe_subscriber_id: subscriber.id,
    pppoe_invoice_id: invoice.id,
    recorded_by: userId,
    paid_at: now.toISOString(),
    metadata: { source: userId ? "staff" : "self_service" },
  });

  if (subscriber.router_id) {
    const router = unwrap(
      await db.from("routers").select("agent_id").eq("id", subscriber.router_id).maybeSingle(),
    );
    if (router?.agent_id) {
      await db.from("agent_commands").insert({
        agent_id: router.agent_id,
        router_id: subscriber.router_id,
        command: "pppoe_enable_secret",
        payload: { username: subscriber.username, expires_at: expires.toISOString() },
      });
    }
  }

  return { ok: true as const, expiresAt: expires.toISOString(), invoice, amount };
}

/* ---------------------------------- sessions ---------------------------------- */

export async function fetchPppoeSessions(db: DB) {
  const active = unwrap(
    await db
      .from("pppoe_sessions")
      .select("*, pppoe_subscribers(full_name, plan_id), routers(name)")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(500),
  );
  const history = unwrap(
    await db
      .from("pppoe_sessions")
      .select("*, routers(name)")
      .eq("is_active", false)
      .order("started_at", { ascending: false })
      .limit(200),
  );
  return { active, history };
}

export async function disconnectSessionRecord(
  db: DB,
  userId: string,
  input: { sessionId: string; reconnect: boolean },
) {
  await assertWriter(db, userId);
  const session = unwrap(
    await db.from("pppoe_sessions").select("*").eq("id", input.sessionId).maybeSingle(),
  );
  if (!session) throw new Error("Session not found");

  if (!input.reconnect) {
    unwrap(
      await db
        .from("pppoe_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          disconnect_reason: "staff_disconnect",
        })
        .eq("id", session.id)
        .select("id")
        .single(),
    );
    if (session.subscriber_id) {
      await db.from("pppoe_subscribers").update({ is_online: false }).eq("id", session.subscriber_id);
    }
  }

  if (session.router_id) {
    const router = unwrap(
      await db.from("routers").select("agent_id").eq("id", session.router_id).maybeSingle(),
    );
    if (router?.agent_id) {
      await db.from("agent_commands").insert({
        agent_id: router.agent_id,
        router_id: session.router_id,
        command: input.reconnect ? "pppoe_reconnect" : "pppoe_disconnect",
        payload: { username: session.username },
      });
    }
  }
  return { ok: true };
}

/* --------------------------------- static IPs --------------------------------- */

export async function fetchStaticIps(db: DB) {
  const allocations = unwrap(
    await db
      .from("static_ip_allocations")
      .select("*, pppoe_subscribers(username, full_name), routers(name)")
      .order("created_at", { ascending: false }),
  );
  const routers = unwrap(await db.from("routers").select("id, name").order("name"));
  const subscribers = unwrap(
    await db.from("pppoe_subscribers").select("id, username, full_name").order("username").limit(1000),
  );
  return { allocations, routers, subscribers };
}

export async function saveStaticIpRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) {
    return unwrap(
      await db.from("static_ip_allocations").update(rest).eq("id", id).select().single(),
    );
  }
  return unwrap(
    await db
      .from("static_ip_allocations")
      .insert({ ...rest, created_by: userId })
      .select()
      .single(),
  );
}

export async function releaseStaticIpRecord(db: DB, userId: string, allocationId: string) {
  await assertWriter(db, userId);
  unwrap(
    await db
      .from("static_ip_allocations")
      .update({ status: "released", released_at: new Date().toISOString(), subscriber_id: null })
      .eq("id", allocationId)
      .select("id")
      .single(),
  );
  return { ok: true };
}

export async function deleteStaticIpRecord(db: DB, userId: string, allocationId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("static_ip_allocations").delete().eq("id", allocationId).select());
  return { ok: true };
}
