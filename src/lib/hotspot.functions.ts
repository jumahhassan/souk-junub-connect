import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  activateVoucherManually,
  bulkUserAction,
  deleteAdRecord,
  deletePackageRecord,
  fetchBatchVouchers,
  fetchHotspotUsers,
  fetchPackages,
  fetchPayments,
  fetchPortal,
  fetchReconciliation,
  fetchVoucherBatches,
  generateVoucherBatch,
  recordPaymentRecord,
  saveAdRecord,
  savePackageRecord,
  savePortalRecord,
  settlePaymentRecord,
  updateVoucherRecord,
} from "./hotspot.server";

const nullableNumber = z.number().nullable().optional();

export const getPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPackages(context.supabase));

export const savePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).nullable().optional(),
        kind: z.enum(["time", "data", "combo"]),
        duration_minutes: nullableNumber,
        data_cap_mb: nullableNumber,
        price_ssp: z.number().min(0),
        validity_days: nullableNumber,
        download_kbps: z.number().min(64),
        upload_kbps: z.number().min(64),
        burst_download_kbps: nullableNumber,
        burst_upload_kbps: nullableNumber,
        burst_threshold_download_kbps: nullableNumber,
        burst_threshold_upload_kbps: nullableNumber,
        burst_time_seconds: nullableNumber,
        fup_enabled: z.boolean(),
        fup_after_mb: nullableNumber,
        fup_download_kbps: nullableNumber,
        fup_upload_kbps: nullableNumber,
        shared_users: z.number().min(1).max(50),
        is_active: z.boolean(),
        sort_order: z.number().min(0).max(999),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => savePackageRecord(context.supabase, context.userId, data));

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ packageId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deletePackageRecord(context.supabase, context.userId, data.packageId),
  );

export const getVoucherBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchVoucherBatches(context.supabase));

export const createVoucherBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        packageId: z.string().uuid(),
        siteId: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(5000),
        codeFormat: z.enum(["grouped", "alnum"]),
        codeLength: z.number().int().min(6).max(20),
        prefix: z.string().trim().max(8).nullable().optional(),
        expiresAt: z.string().nullable().optional(),
        notes: z.string().trim().max(300).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => generateVoucherBatch(context.supabase, context.userId, data));

export const getBatchVouchers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ batchId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => fetchBatchVouchers(context.supabase, data.batchId));

export const updateVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        voucherId: z.string().uuid(),
        state: z.enum(["unused", "active", "expired", "used"]).optional(),
        expiresAt: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => updateVoucherRecord(context.supabase, context.userId, data));

export const activateVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().trim().min(4).max(32) }).parse(input))
  .handler(async ({ context, data }) =>
    activateVoucherManually(context.supabase, context.userId, data.code),
  );

export const getHotspotUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchHotspotUsers(context.supabase));

export const runUserAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userIds: z.array(z.string().uuid()).min(1).max(500),
        action: z.enum(["suspend", "unsuspend", "extend", "change_package", "disconnect"]),
        days: z.number().int().min(1).max(365).optional(),
        packageId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => bulkUserAction(context.supabase, context.userId, data));

export const getPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPortal(context.supabase));

export const savePortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(80),
        theme: z.string().trim().max(30),
        primary_color: z.string().trim().max(20),
        secondary_color: z.string().trim().max(20),
        accent_color: z.string().trim().max(20),
        logo_url: z.string().trim().max(500).nullable().optional(),
        background_url: z.string().trim().max(500).nullable().optional(),
        custom_css: z.string().max(4000).nullable().optional(),
        welcome_title: z.string().trim().max(120),
        welcome_message: z.string().trim().max(400).nullable().optional(),
        terms_text: z.string().trim().max(600).nullable().optional(),
        allow_voucher: z.boolean(),
        allow_userpass: z.boolean(),
        allow_otp: z.boolean(),
        trial_enabled: z.boolean(),
        trial_mode: z.enum(["one_click", "otp", "form"]),
        trial_minutes: z.number().int().min(5).max(1440),
        trial_data_mb: z.number().int().min(10).max(10240),
        trial_max_per_device_per_day: z.number().int().min(1).max(10),
        languages: z.array(z.string().max(5)).min(1),
        default_language: z.string().max(5),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => savePortalRecord(context.supabase, context.userId, data));

export const saveAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        portal_id: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(2).max(80),
        kind: z.enum(["image", "video", "text"]),
        asset_url: z.string().trim().max(500).nullable().optional(),
        body_text: z.string().trim().max(300).nullable().optional(),
        target_url: z.string().trim().max(500).nullable().optional(),
        starts_at: z.string().nullable().optional(),
        ends_at: z.string().nullable().optional(),
        is_active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveAdRecord(context.supabase, context.userId, data));

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ adId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteAdRecord(context.supabase, context.userId, data.adId));

export const getPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPayments(context.supabase));

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.enum(["mtn_momo", "zain_cash", "nips", "tola", "cash"]),
        msisdn: z.string().trim().max(20).nullable().optional(),
        amountSsp: z.number().min(0).optional(),
        packageId: z.string().uuid().nullable().optional(),
        note: z.string().trim().max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => recordPaymentRecord(context.supabase, context.userId, data));

export const settlePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        outcome: z.enum(["success", "failed", "retry"]),
        reason: z.string().trim().max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => settlePaymentRecord(context.supabase, context.userId, data));

export const getReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ day: z.string().min(10).max(10) }).parse(input))
  .handler(async ({ context, data }) => fetchReconciliation(context.supabase, data.day));
