/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public captive-portal endpoints. No session required — callers are anonymous WiFi guests. */

export const getPortalConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: portals } = await supabaseAdmin
    .from("portal_settings")
    .select("*")
    .eq("is_active", true)
    .order("created_at")
    .limit(1);
  const { data: packages } = await supabaseAdmin
    .from("hotspot_packages")
    .select("id, name, kind, price_ssp, duration_minutes, data_cap_mb")
    .eq("is_active", true)
    .order("sort_order");
  const { data: ads } = await supabaseAdmin
    .from("portal_ads")
    .select("id, title, kind, asset_url, body_text, target_url")
    .eq("is_active", true)
    .limit(5);
  return { portal: portals?.[0] ?? null, packages: packages ?? [], ads: ads ?? [] };
});

export const redeemVoucher = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(32),
        macAddress: z.string().trim().max(32).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: voucher } = await supabaseAdmin
      .from("vouchers")
      .select("*, hotspot_packages(*)")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!voucher) return { ok: false as const, message: "Voucher code not recognised." };
    if (voucher.state === "used" || voucher.state === "expired")
      return { ok: false as const, message: `This voucher is ${voucher.state}.` };

    const pkg: any = (voucher as any).hotspot_packages;
    const now = new Date();
    let expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : null;

    if (voucher.state === "unused") {
      expiresAt = new Date(
        now.getTime() +
          (pkg?.duration_minutes
            ? pkg.duration_minutes * 60_000
            : (pkg?.validity_days ?? 1) * 86_400_000),
      );
      await supabaseAdmin
        .from("vouchers")
        .update({
          state: "active",
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          mac_address: data.macAddress ?? null,
        })
        .eq("id", voucher.id);
    } else if (expiresAt && expiresAt < now) {
      await supabaseAdmin.from("vouchers").update({ state: "expired" }).eq("id", voucher.id);
      return { ok: false as const, message: "This voucher has expired." };
    }

    return {
      ok: true as const,
      message: "You are online.",
      packageName: pkg?.name ?? "Hotspot access",
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  });

export const startFreeTrial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fingerprint: z.string().trim().min(4).max(120),
        phone: z.string().trim().max(20).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: portals } = await supabaseAdmin
      .from("portal_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1);
    const portal: any = portals?.[0];
    if (!portal?.trial_enabled) return { ok: false as const, message: "Free trial is not available." };

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await supabaseAdmin
      .from("trial_grants")
      .select("id", { count: "exact", head: true })
      .eq("device_fingerprint", data.fingerprint)
      .gte("granted_at", since);

    if ((count ?? 0) >= portal.trial_max_per_device_per_day)
      return { ok: false as const, message: "Free trial limit reached for this device today." };

    const expiresAt = new Date(Date.now() + portal.trial_minutes * 60_000).toISOString();
    await supabaseAdmin.from("trial_grants").insert({
      device_fingerprint: data.fingerprint,
      phone: data.phone ?? null,
      expires_at: expiresAt,
    });

    return {
      ok: true as const,
      message: `Free trial started — ${portal.trial_minutes} minutes / ${portal.trial_data_mb} MB.`,
      expiresAt,
    };
  });
