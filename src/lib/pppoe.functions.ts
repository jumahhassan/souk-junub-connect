import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deletePppoePlanRecord,
  deleteStaticIpRecord,
  deleteSubscriberRecord,
  disconnectSessionRecord,
  fetchPppoePlans,
  fetchPppoeSessions,
  fetchStaticIps,
  fetchSubscriberDetail,
  fetchSubscribers,
  importSubscribersRecord,
  releaseStaticIpRecord,
  renewSubscriberRecord,
  savePppoePlanRecord,
  saveStaticIpRecord,
  saveSubscriberRecord,
  setSubscriberStatusRecord,
  transferSubscribersRecord,
} from "./pppoe.server";

const nullableInt = z.number().int().nullable().optional();

export const getPppoePlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPppoePlans(context.supabase));

export const savePppoePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).nullable(),
        profile_name: z.string().trim().min(2).max(60),
        download_kbps: z.number().int().min(64).max(10_000_000),
        upload_kbps: z.number().int().min(64).max(10_000_000),
        burst_download_kbps: nullableInt,
        burst_upload_kbps: nullableInt,
        burst_threshold_download_kbps: nullableInt,
        burst_threshold_upload_kbps: nullableInt,
        burst_time_seconds: nullableInt,
        local_address: z.string().trim().max(60).nullable(),
        remote_address_pool: z.string().trim().max(60).nullable(),
        dns_servers: z.string().trim().max(120).nullable(),
        change_tcp_mss: z.boolean(),
        use_compression: z.boolean(),
        use_encryption: z.boolean(),
        only_one: z.boolean(),
        billing_type: z.enum(["prepaid", "postpaid"]),
        billing_cycle: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
        price_ssp: z.number().min(0),
        fup_enabled: z.boolean(),
        fup_after_gb: z.number().min(0).nullable().optional(),
        fup_download_kbps: nullableInt,
        fup_upload_kbps: nullableInt,
        is_active: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => savePppoePlanRecord(context.supabase, context.userId, data));

export const deletePppoePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deletePppoePlanRecord(context.supabase, context.userId, data.planId),
  );

export const getSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchSubscribers(context.supabase));

export const getSubscriberDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ subscriberId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    fetchSubscriberDetail(context.supabase, data.subscriberId),
  );

export const saveSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        username: z.string().trim().min(2).max(60),
        password: z.string().trim().min(3).max(120),
        service: z.string().trim().min(2).max(20),
        plan_id: z.string().uuid().nullable(),
        router_id: z.string().uuid().nullable(),
        site_id: z.string().uuid().nullable(),
        full_name: z.string().trim().max(120).nullable(),
        phone: z.string().trim().max(30).nullable(),
        email: z.string().trim().max(180).nullable(),
        address: z.string().trim().max(200).nullable(),
        caller_id: z.string().trim().max(40).nullable(),
        remote_address: z.string().trim().max(60).nullable(),
        local_address: z.string().trim().max(60).nullable(),
        comment: z.string().trim().max(300).nullable(),
        status: z.enum(["active", "disabled", "expired"]),
        auto_renew: z.boolean(),
        expires_at: z.string().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveSubscriberRecord(context.supabase, context.userId, data));

export const deleteSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ subscriberId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deleteSubscriberRecord(context.supabase, context.userId, data.subscriberId),
  );

export const importSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        rows: z
          .array(
            z.object({
              username: z.string().trim().max(60),
              password: z.string().trim().max(120).optional(),
              full_name: z.string().trim().max(120).optional(),
              phone: z.string().trim().max(30).optional(),
              caller_id: z.string().trim().max(40).optional(),
              remote_address: z.string().trim().max(60).optional(),
              comment: z.string().trim().max(300).optional(),
              plan: z.string().trim().max(80).optional(),
            }),
          )
          .min(1)
          .max(2000),
        routerId: z.string().uuid().nullable(),
        siteId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    importSubscribersRecord(context.supabase, context.userId, data),
  );

export const transferSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subscriberIds: z.array(z.string().uuid()).min(1).max(2000),
        targetRouterId: z.string().uuid(),
        planMap: z
          .array(z.object({ fromPlanId: z.string().uuid(), toPlanId: z.string().uuid() }))
          .max(50),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    transferSubscribersRecord(context.supabase, context.userId, data),
  );

export const setSubscriberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subscriberIds: z.array(z.string().uuid()).min(1).max(2000),
        status: z.enum(["active", "disabled", "expired"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    setSubscriberStatusRecord(context.supabase, context.userId, data),
  );

export const renewSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subscriberId: z.string().uuid(),
        cycles: z.number().int().min(1).max(12),
        provider: z.enum(["mtn_momo", "zain_cash", "nips", "tola", "cash"]).optional(),
        reference: z.string().trim().max(60).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    renewSubscriberRecord(context.supabase, context.userId, data),
  );

export const getPppoeSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPppoeSessions(context.supabase));

export const disconnectPppoeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid(), reconnect: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) =>
    disconnectSessionRecord(context.supabase, context.userId, data),
  );

export const getStaticIps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchStaticIps(context.supabase));

export const saveStaticIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        ip_address: z.string().trim().min(7).max(45),
        subscriber_id: z.string().uuid().nullable(),
        router_id: z.string().uuid().nullable(),
        mac_address: z.string().trim().max(40).nullable(),
        label: z.string().trim().max(80).nullable(),
        monthly_fee_ssp: z.number().min(0),
        status: z.enum(["assigned", "reserved", "released"]),
        notes: z.string().trim().max(300).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveStaticIpRecord(context.supabase, context.userId, data));

export const releaseStaticIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ allocationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    releaseStaticIpRecord(context.supabase, context.userId, data.allocationId),
  );

export const deleteStaticIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ allocationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deleteStaticIpRecord(context.supabase, context.userId, data.allocationId),
  );
