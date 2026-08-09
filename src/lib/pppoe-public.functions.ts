/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { renewSubscriberRecord } from "./pppoe.server";

/**
 * Public PPPoE self-service endpoints. Subscribers identify themselves with their
 * PPPoE username + account phone number; no staff session is involved.
 */

const identity = z.object({
  username: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(6).max(30),
});

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("211") ? digits.slice(3) : digits.replace(/^0/, "");
}

function safeSubscriber(row: any) {
  return {
    id: row.id as string,
    username: row.username as string,
    fullName: (row.full_name ?? null) as string | null,
    status: row.status as string,
    isOnline: Boolean(row.is_online),
    autoRenew: Boolean(row.auto_renew),
    expiresAt: (row.expires_at ?? null) as string | null,
    plan: row.pppoe_plans
      ? {
          name: row.pppoe_plans.name as string,
          priceSsp: Number(row.pppoe_plans.price_ssp ?? 0),
          billingCycle: row.pppoe_plans.billing_cycle as string,
          downloadKbps: Number(row.pppoe_plans.download_kbps ?? 0),
          uploadKbps: Number(row.pppoe_plans.upload_kbps ?? 0),
        }
      : null,
  };
}

async function lookup(username: string, phone: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pppoe_subscribers")
    .select("*, pppoe_plans(name, price_ssp, billing_cycle, download_kbps, upload_kbps)")
    .eq("username", username)
    .maybeSingle();
  if (!data) return null;
  if (!data.phone || normalisePhone(data.phone) !== normalisePhone(phone)) return null;
  return data as any;
}

export const lookupPppoeAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identity.parse(input))
  .handler(async ({ data }) => {
    const row = await lookup(data.username, data.phone);
    if (!row) {
      return { ok: false as const, message: "No account matches that username and phone number." };
    }
    return { ok: true as const, subscriber: safeSubscriber(row) };
  });

export const renewPppoeAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    identity
      .extend({
        cycles: z.number().int().min(1).max(12),
        provider: z.enum(["mtn_momo", "zain_cash", "nips", "tola"]),
        autoRenew: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const row = await lookup(data.username, data.phone);
    if (!row) {
      return { ok: false as const, message: "No account matches that username and phone number." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result = await renewSubscriberRecord(supabaseAdmin as any, null, {
      subscriberId: row.id,
      cycles: data.cycles,
      provider: data.provider,
      reference: `SELF-${Date.now().toString(36).toUpperCase()}`,
    });

    if (typeof data.autoRenew === "boolean") {
      await supabaseAdmin
        .from("pppoe_subscribers")
        .update({ auto_renew: data.autoRenew })
        .eq("id", row.id);
    }

    const { data: fresh } = await supabaseAdmin
      .from("pppoe_subscribers")
      .select("*, pppoe_plans(name, price_ssp, billing_cycle, download_kbps, upload_kbps)")
      .eq("id", row.id)
      .maybeSingle();

    return {
      ok: true as const,
      amount: result.amount,
      receipt: (result.invoice as any)?.invoice_number as string,
      expiresAt: result.expiresAt,
      subscriber: fresh ? safeSubscriber(fresh) : null,
    };
  });
