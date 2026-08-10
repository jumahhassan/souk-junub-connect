/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only helpers for CRM: customers, notifications, messaging and support tickets. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWriter } from "./network.server";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Normalise any South Sudan number to +211XXXXXXXXX. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("211")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.length < 8) return `+211${local}`;
  return `+211${local.slice(-9)}`;
}

export function telcoFor(phone: string | null | undefined): string {
  const p = normalisePhone(phone);
  if (!p) return "unknown";
  const prefix = p.slice(4, 6);
  if (prefix === "92") return "MTN";
  if (prefix === "99") return "Zain";
  if (prefix === "98") return "Digitel";
  return "other";
}

export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/* --------------------------------- customers -------------------------------- */

export async function fetchCustomers(db: DB) {
  const customers = unwrap(
    await db
      .from("customers")
      .select(
        "*, routers(name), sites(name), hotspot_users(username, status, expires_at, data_used_mb), pppoe_subscribers(username, status, expires_at)",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
  );
  const stats = {
    total: customers.length,
    active: customers.filter((c: any) => c.status === "active").length,
    expired: customers.filter((c: any) => c.status === "expired").length,
    suspended: customers.filter((c: any) => c.status === "suspended").length,
    paused: customers.filter((c: any) => c.status === "paused").length,
  };
  return { customers, stats };
}

export async function saveCustomerRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  const payload = { ...rest, phone: normalisePhone(rest.phone) };
  if (id) {
    return unwrap(await db.from("customers").update(payload).eq("id", id).select().single());
  }
  return unwrap(
    await db
      .from("customers")
      .insert({ ...payload, created_by: userId })
      .select()
      .single(),
  );
}

export async function deleteCustomerRecord(db: DB, userId: string, customerId: string) {
  await assertWriter(db, userId);
  unwrap(await db.from("customers").delete().eq("id", customerId).select());
  return { ok: true };
}

export async function fetchCustomerProfile(db: DB, customerId: string) {
  const customer = unwrap(
    await db
      .from("customers")
      .select(
        "*, routers(name, host), sites(name, city), hotspot_users(*), pppoe_subscribers(*, pppoe_plans(name, price_ssp, download_kbps, upload_kbps))",
      )
      .eq("id", customerId)
      .single(),
  );

  const hotspotId = customer.hotspot_user_id;
  const subscriberId = customer.pppoe_subscriber_id;

  const paymentsQuery = db
    .from("payments")
    .select("*, hotspot_packages(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const orFilters: string[] = [];
  if (hotspotId) orFilters.push(`hotspot_user_id.eq.${hotspotId}`);
  if (subscriberId) orFilters.push(`pppoe_subscriber_id.eq.${subscriberId}`);
  const payments = orFilters.length
    ? unwrap(await paymentsQuery.or(orFilters.join(",")))
    : [];

  const hotspotSessions = hotspotId
    ? unwrap(
        await db
          .from("hotspot_sessions")
          .select("*, routers(name)")
          .eq("hotspot_user_id", hotspotId)
          .order("started_at", { ascending: false })
          .limit(50),
      )
    : [];

  const pppoeSessions = subscriberId
    ? unwrap(
        await db
          .from("pppoe_sessions")
          .select("*, routers(name)")
          .eq("subscriber_id", subscriberId)
          .order("started_at", { ascending: false })
          .limit(50),
      )
    : [];

  const invoices = subscriberId
    ? unwrap(
        await db
          .from("pppoe_invoices")
          .select("*, pppoe_plans(name)")
          .eq("subscriber_id", subscriberId)
          .order("created_at", { ascending: false })
          .limit(50),
      )
    : [];

  const vouchers = customer.phone
    ? unwrap(
        await db
          .from("vouchers")
          .select("*, hotspot_packages(name, price_ssp)")
          .eq("phone", customer.phone)
          .order("created_at", { ascending: false })
          .limit(50),
      )
    : [];

  const tickets = unwrap(
    await db
      .from("support_tickets")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  );

  const messages = unwrap(
    await db
      .from("message_log")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(100),
  );

  return {
    customer,
    payments,
    hotspotSessions,
    pppoeSessions,
    invoices,
    vouchers,
    tickets,
    messages,
  };
}

/** Pull existing hotspot users and PPPoE subscribers that have no customer record yet. */
export async function importCustomersFromNetwork(db: DB, userId: string) {
  await assertWriter(db, userId);
  const existing = unwrap(await db.from("customers").select("hotspot_user_id, pppoe_subscriber_id"));
  const hsTaken = new Set(existing.map((r: any) => r.hotspot_user_id).filter(Boolean));
  const ppTaken = new Set(existing.map((r: any) => r.pppoe_subscriber_id).filter(Boolean));

  const hotspot = unwrap(
    await db.from("hotspot_users").select("id, username, full_name, phone, email, status, site_id, last_router_id"),
  );
  const pppoe = unwrap(
    await db
      .from("pppoe_subscribers")
      .select("id, username, full_name, phone, email, address, status, site_id, router_id"),
  );

  const rows: any[] = [];
  for (const u of hotspot) {
    if (hsTaken.has(u.id)) continue;
    rows.push({
      full_name: u.full_name ?? u.username,
      phone: normalisePhone(u.phone),
      email: u.email,
      customer_type: "hotspot",
      status: u.status === "active" ? "active" : "expired",
      hotspot_user_id: u.id,
      site_id: u.site_id,
      router_id: u.last_router_id,
      created_by: userId,
    });
  }
  for (const s of pppoe) {
    if (ppTaken.has(s.id)) continue;
    rows.push({
      full_name: s.full_name ?? s.username,
      phone: normalisePhone(s.phone),
      email: s.email,
      address: s.address,
      customer_type: "pppoe",
      status: s.status === "active" ? "active" : s.status === "disabled" ? "suspended" : "expired",
      pppoe_subscriber_id: s.id,
      site_id: s.site_id,
      router_id: s.router_id,
      created_by: userId,
    });
  }
  if (rows.length === 0) return { imported: 0 };
  unwrap(await db.from("customers").insert(rows).select("id"));
  return { imported: rows.length };
}

/* ------------------------------- messaging ---------------------------------- */

const PROVIDER_SECRETS: Record<string, string> = {
  junubsms: "JUNUBSMS_API_KEY",
  oracom: "ORACOM_API_KEY",
  easysendsms: "EASYSENDSMS_API_KEY",
  bulksms: "BULKSMS_API_KEY",
  zigatext: "ZIGATEXT_API_KEY",
  africastalking: "AFRICASTALKING_API_KEY",
  whatsapp_cloud: "WHATSAPP_ACCESS_TOKEN",
  smtp: "SMTP_PASSWORD",
};

export function providerSecretName(provider: string) {
  return PROVIDER_SECRETS[provider] ?? null;
}

export async function fetchMessagingConfig(db: DB) {
  const providers = unwrap(
    await db.from("messaging_providers").select("*").order("channel").order("label"),
  );
  const templates = unwrap(await db.from("message_templates").select("*").order("channel").order("name"));
  const campaigns = unwrap(
    await db.from("message_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
  );
  const log = unwrap(
    await db
      .from("message_log")
      .select("*, customers(full_name)")
      .order("created_at", { ascending: false })
      .limit(200),
  );
  const withSecret = providers.map((p: any) => ({
    ...p,
    secret_name: providerSecretName(p.provider),
    secret_present: Boolean(process.env[providerSecretName(p.provider) ?? "___"]),
  }));
  return { providers: withSecret, templates, campaigns, log };
}

export async function saveProviderRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (rest.is_default && id) {
    unwrap(
      await db
        .from("messaging_providers")
        .update({ is_default: false })
        .eq("channel", rest.channel)
        .neq("id", id)
        .select("id"),
    );
  }
  if (id) return unwrap(await db.from("messaging_providers").update(rest).eq("id", id).select().single());
  return unwrap(await db.from("messaging_providers").insert(rest).select().single());
}

export async function saveTemplateRecord(db: DB, userId: string, input: any) {
  await assertWriter(db, userId);
  const { id, ...rest } = input;
  if (id) return unwrap(await db.from("message_templates").update(rest).eq("id", id).select().single());
  return unwrap(await db.from("message_templates").insert(rest).select().single());
}

/** Deliver one message through the configured gateway; falls back to a queued log row. */
async function deliver(provider: any, to: string, body: string, subject?: string | null) {
  const secretName = providerSecretName(provider?.provider ?? "");
  const key = secretName ? process.env[secretName] : undefined;
  if (!provider || !provider.is_active || !key) {
    return { status: "queued" as const, error: "Gateway not configured — message held in outbox." };
  }
  try {
    if (provider.channel === "whatsapp") {
      const phoneId = provider.config?.phone_number_id;
      const res = await fetch(`${provider.base_url}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace("+", ""),
          type: "text",
          text: { body },
        }),
      });
      if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
    } else if (provider.channel === "email") {
      throw new Error("SMTP relay not reachable from this runtime — use an HTTP email provider.");
    } else {
      const res = await fetch(provider.base_url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to, from: provider.sender_id, sender: provider.sender_id, message: body, text: body, subject }),
      });
      if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
    }
    return { status: "sent" as const, error: null };
  } catch (e) {
    return { status: "failed" as const, error: (e as Error).message.slice(0, 400) };
  }
}

async function defaultProvider(db: DB, channel: string) {
  const rows = unwrap(
    await db
      .from("messaging_providers")
      .select("*")
      .eq("channel", channel)
      .order("is_default", { ascending: false })
      .limit(1),
  );
  return rows?.[0] ?? null;
}

export async function sendMessageRecord(
  db: DB,
  userId: string,
  input: {
    customerId?: string | null | undefined;
    channel: "sms" | "whatsapp" | "email";
    to: string;
    body: string;
    templateKey?: string | null | undefined;
    scheduledFor?: string | null | undefined;
    campaignId?: string | null | undefined;
  },
) {
  await assertWriter(db, userId);
  const to = input.channel === "email" ? input.to : (normalisePhone(input.to) ?? input.to);
  const provider = await defaultProvider(db, input.channel);

  if (input.scheduledFor && new Date(input.scheduledFor) > new Date()) {
    return unwrap(
      await db
        .from("message_log")
        .insert({
          customer_id: input.customerId ?? null,
          campaign_id: input.campaignId ?? null,
          template_key: input.templateKey ?? null,
          channel: input.channel,
          provider: provider?.provider ?? null,
          to_address: to,
          body: input.body,
          status: "scheduled",
          scheduled_for: input.scheduledFor,
        })
        .select()
        .single(),
    );
  }

  const result = await deliver(provider, to, input.body);
  return unwrap(
    await db
      .from("message_log")
      .insert({
        customer_id: input.customerId ?? null,
        campaign_id: input.campaignId ?? null,
        template_key: input.templateKey ?? null,
        channel: input.channel,
        provider: provider?.provider ?? null,
        to_address: to,
        body: input.body,
        status: result.status,
        error: result.error,
        sent_at: result.status === "sent" ? new Date().toISOString() : null,
      })
      .select()
      .single(),
  );
}

export async function runCampaignRecord(
  db: DB,
  userId: string,
  input: {
    name: string;
    channel: "sms" | "whatsapp" | "email";
    body: string;
    audience: { status?: string | undefined; customerType?: string | undefined };
    scheduledFor?: string | null | undefined;
  },
) {
  await assertWriter(db, userId);
  let query = db.from("customers").select("id, full_name, phone, email");
  if (input.audience.status && input.audience.status !== "all")
    query = query.eq("status", input.audience.status);
  if (input.audience.customerType && input.audience.customerType !== "all")
    query = query.eq("customer_type", input.audience.customerType);
  const recipients = unwrap(await query).filter((c: any) =>
    input.channel === "email" ? Boolean(c.email) : Boolean(c.phone),
  );

  const scheduled = Boolean(input.scheduledFor && new Date(input.scheduledFor) > new Date());
  const campaign = unwrap(
    await db
      .from("message_campaigns")
      .insert({
        name: input.name,
        channel: input.channel,
        body: input.body,
        audience: input.audience,
        scheduled_for: input.scheduledFor ?? null,
        status: scheduled ? "scheduled" : "sending",
        total_recipients: recipients.length,
        created_by: userId,
      })
      .select()
      .single(),
  );

  const provider = await defaultProvider(db, input.channel);
  let sent = 0;
  let failed = 0;
  const rows: any[] = [];

  for (const c of recipients) {
    const to = input.channel === "email" ? c.email : c.phone;
    const body = renderTemplate(input.body, { name: c.full_name });
    if (scheduled) {
      rows.push({
        customer_id: c.id,
        campaign_id: campaign.id,
        channel: input.channel,
        provider: provider?.provider ?? null,
        to_address: to,
        body,
        status: "scheduled",
        scheduled_for: input.scheduledFor,
      });
      continue;
    }
    const result = await deliver(provider, to, body);
    if (result.status === "sent") sent += 1;
    else if (result.status === "failed") failed += 1;
    rows.push({
      customer_id: c.id,
      campaign_id: campaign.id,
      channel: input.channel,
      provider: provider?.provider ?? null,
      to_address: to,
      body,
      status: result.status,
      error: result.error,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    });
  }

  if (rows.length) unwrap(await db.from("message_log").insert(rows).select("id"));
  unwrap(
    await db
      .from("message_campaigns")
      .update({
        status: scheduled ? "scheduled" : "completed",
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", campaign.id)
      .select("id"),
  );
  return { campaignId: campaign.id, recipients: recipients.length, sent, failed, scheduled };
}

/** Queue expiry reminders for hotspot users and PPPoE subscribers (3 days / 1 day / today). */
export async function runExpiryRemindersRecord(db: DB) {
  const templates = unwrap(await db.from("message_templates").select("*"));
  const byKey = new Map(templates.map((t: any) => [t.key, t]));
  const customers = unwrap(
    await db
      .from("customers")
      .select(
        "id, full_name, phone, hotspot_users(expires_at, hotspot_packages(name, price_ssp)), pppoe_subscribers(expires_at, pppoe_plans(name, price_ssp))",
      )
      .not("phone", "is", null),
  );

  const now = Date.now();
  const provider = await defaultProvider(db, "sms");
  const rows: any[] = [];

  for (const c of customers) {
    const hs: any = c.hotspot_users;
    const pp: any = c.pppoe_subscribers;
    const expiry = pp?.expires_at ?? hs?.expires_at;
    if (!expiry) continue;
    const days = Math.ceil((new Date(expiry).getTime() - now) / 86_400_000);
    const key = days === 3 ? "expiry_3d" : days === 1 ? "expiry_1d" : days === 0 ? "expiry_today" : null;
    if (!key) continue;
    const template: any = byKey.get(key);
    if (!template || !template.is_active) continue;

    const already = unwrap(
      await db
        .from("message_log")
        .select("id")
        .eq("customer_id", c.id)
        .eq("template_key", key)
        .gte("created_at", new Date(now - 20 * 3600_000).toISOString())
        .limit(1),
    );
    if (already.length) continue;

    const plan = pp?.pppoe_plans ?? hs?.hotspot_packages;
    const body = renderTemplate(template.body, {
      name: c.full_name,
      package: plan?.name ?? "internet",
      amount: plan?.price_ssp ?? "",
      expiry: new Date(expiry).toLocaleDateString("en-GB"),
    });
    const result = await deliver(provider, c.phone, body);
    rows.push({
      customer_id: c.id,
      template_key: key,
      channel: "sms",
      provider: provider?.provider ?? null,
      to_address: c.phone,
      body,
      status: result.status,
      error: result.error,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    });
  }

  if (rows.length) unwrap(await db.from("message_log").insert(rows).select("id"));
  return { queued: rows.length };
}

/* --------------------------------- tickets ---------------------------------- */

const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };

export async function fetchTickets(db: DB) {
  const tickets = unwrap(
    await db
      .from("support_tickets")
      .select("*, customers(full_name, phone), routers(name), profiles:assigned_to(full_name)")
      .order("created_at", { ascending: false })
      .limit(500),
  );
  const staff = unwrap(await db.from("profiles").select("id, full_name, job_title").order("full_name"));
  const stats = {
    open: tickets.filter((t: any) => t.status === "open").length,
    inProgress: tickets.filter((t: any) => t.status === "in_progress").length,
    resolved: tickets.filter((t: any) => t.status === "resolved").length,
    breached: tickets.filter(
      (t: any) => t.sla_due_at && !t.resolved_at && new Date(t.sla_due_at) < new Date(),
    ).length,
  };
  return { tickets, staff, stats };
}

export async function fetchTicketThread(db: DB, ticketId: string) {
  const ticket = unwrap(
    await db
      .from("support_tickets")
      .select("*, customers(id, full_name, phone), routers(name)")
      .eq("id", ticketId)
      .single(),
  );
  const messages = unwrap(
    await db.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at"),
  );
  return { ticket, messages };
}

export async function saveTicketRecord(db: DB, userId: string, input: any) {
  const { id, ...rest } = input;
  if (id) {
    await assertWriter(db, userId);
    const patch: any = { ...rest };
    if (rest.priority) patch.sla_due_at = new Date(Date.now() + (SLA_HOURS[rest.priority] ?? 24) * 3600_000).toISOString();
    if (rest.status === "resolved") patch.resolved_at = new Date().toISOString();
    if (rest.status === "closed") patch.closed_at = new Date().toISOString();
    return unwrap(await db.from("support_tickets").update(patch).eq("id", id).select().single());
  }
  const priority = rest.priority ?? "medium";
  return unwrap(
    await db
      .from("support_tickets")
      .insert({
        ...rest,
        priority,
        sla_due_at: new Date(Date.now() + (SLA_HOURS[priority] ?? 24) * 3600_000).toISOString(),
        created_by: userId,
      })
      .select()
      .single(),
  );
}

export async function addTicketMessageRecord(
  db: DB,
  userId: string,
  input: { ticketId: string; body: string; isInternal: boolean; notifyCustomer?: boolean | undefined },
) {
  const profile = unwrap(await db.from("profiles").select("full_name").eq("id", userId).maybeSingle());
  const message = unwrap(
    await db
      .from("ticket_messages")
      .insert({
        ticket_id: input.ticketId,
        author_id: userId,
        author_name: profile?.full_name ?? "Support agent",
        body: input.body,
        is_internal: input.isInternal,
        channel: "portal",
      })
      .select()
      .single(),
  );

  if (!input.isInternal && input.notifyCustomer) {
    const ticket = unwrap(
      await db
        .from("support_tickets")
        .select("ticket_number, customer_id, customers(phone, full_name)")
        .eq("id", input.ticketId)
        .single(),
    );
    const phone = (ticket.customers as any)?.phone;
    if (phone) {
      await sendMessageRecord(db, userId, {
        customerId: ticket.customer_id,
        channel: "sms",
        to: phone,
        body: `SOUK JUNUB Support (${ticket.ticket_number}): ${input.body}`.slice(0, 320),
      });
    }
  }
  if (!unwrap(await db.from("support_tickets").select("first_response_at").eq("id", input.ticketId).single())
    .first_response_at && !input.isInternal) {
    unwrap(
      await db
        .from("support_tickets")
        .update({ first_response_at: new Date().toISOString(), status: "in_progress" })
        .eq("id", input.ticketId)
        .select("id"),
    );
  }
  return message;
}

/** Turn unresolved critical router alerts into support tickets. */
export async function ticketsFromAlertsRecord(db: DB, userId: string) {
  await assertWriter(db, userId);
  const alerts = unwrap(
    await db
      .from("alerts")
      .select("id, router_id, severity, kind, title, detail, created_at, routers(name)")
      .is("resolved_at", null)
      .in("severity", ["critical", "warning"])
      .order("created_at", { ascending: false })
      .limit(50),
  );
  const existing = unwrap(
    await db.from("support_tickets").select("subject").eq("source", "router_alert"),
  );
  const seen = new Set(existing.map((t: any) => t.subject));
  const rows = alerts
    .filter((a: any) => !seen.has(`${a.title} — ${(a.routers as any)?.name ?? "router"}`))
    .map((a: any) => ({
      subject: `${a.title} — ${(a.routers as any)?.name ?? "router"}`,
      description: a.detail ?? a.kind,
      category: "connection",
      priority: a.severity === "critical" ? "critical" : "high",
      status: "open",
      source: "router_alert",
      router_id: a.router_id,
      sla_due_at: new Date(Date.now() + (a.severity === "critical" ? 4 : 8) * 3600_000).toISOString(),
      created_by: userId,
    }));
  if (!rows.length) return { created: 0 };
  unwrap(await db.from("support_tickets").insert(rows).select("id"));
  return { created: rows.length };
}
