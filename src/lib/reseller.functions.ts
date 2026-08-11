import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  allocateVouchersRecord,
  decidePayoutRecord,
  deleteResellerRecord,
  fetchAllocations,
  fetchCommissionRules,
  fetchMyReseller,
  fetchPayouts,
  fetchResellers,
  requestPayoutRecord,
  saveCommissionRuleRecord,
  saveResellerRecord,
  sellVoucherRecord,
  settleAllRecord,
} from "./reseller.server";

export const getResellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchResellers(context.supabase));

export const saveReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        full_name: z.string().trim().min(2).max(100),
        code: z.string().trim().max(30).optional(),
        phone: z.string().trim().max(30).nullable(),
        email: z.string().trim().max(120).nullable(),
        area: z.string().trim().max(80).nullable(),
        tier: z.enum(["master", "sub", "retailer"]),
        parent_id: z.string().uuid().nullable(),
        commission_type: z.enum(["percent", "fixed"]),
        commission_rate: z.number().min(0).max(1_000_000),
        status: z.enum(["active", "suspended", "closed"]),
        user_id: z.string().uuid().nullable(),
        notes: z.string().trim().max(500).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    saveResellerRecord(context.supabase, context.userId, data),
  );

export const deleteReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resellerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) =>
    deleteResellerRecord(context.supabase, context.userId, data.resellerId),
  );

export const allocateVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resellerId: z.string().uuid(),
        batchId: z.string().uuid(),
        quantity: z.number().int().min(1).max(5000),
        note: z.string().trim().max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    allocateVouchersRecord(context.supabase, context.userId, data),
  );

export const getAllocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchAllocations(context.supabase, null));

export const getMyResellerPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchMyReseller(context.supabase, context.userId));

export const sellVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        voucherId: z.string().uuid(),
        customerPhone: z.string().trim().max(30).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => sellVoucherRecord(context.supabase, context.userId, data));

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        amount: z.number().min(1),
        method: z.string().trim().min(2).max(40),
        destination: z.string().trim().max(60).nullable().optional(),
        note: z.string().trim().max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    requestPayoutRecord(context.supabase, context.userId, data),
  );

export const getPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchPayouts(context.supabase));

export const decidePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        payoutId: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "paid"]),
        reference: z.string().trim().max(60).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => decidePayoutRecord(context.supabase, context.userId, data));

export const settleAllCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ resellerId: z.string().uuid(), method: z.string().trim().min(2).max(40) })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    settleAllRecord(context.supabase, context.userId, data.resellerId, data.method),
  );

export const saveCommissionRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resellerId: z.string().uuid(),
        packageId: z.string().uuid(),
        commissionType: z.enum(["percent", "fixed"]),
        commissionRate: z.number().min(0).max(1_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    saveCommissionRuleRecord(context.supabase, context.userId, data),
  );

export const getCommissionRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resellerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => fetchCommissionRules(context.supabase, data.resellerId));
