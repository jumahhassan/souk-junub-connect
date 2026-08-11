import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fetchFinanceReport,
  fetchGateways,
  generateInvoicesRecord,
  saveGatewayRecord,
} from "./finance.server";

export const getFinanceReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        from: z.string().trim().max(10).nullable().optional(),
        to: z.string().trim().max(10).nullable().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => fetchFinanceReport(context.supabase, data));

export const generateInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => generateInvoicesRecord(context.supabase, context.userId));

export const getGateways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchGateways(context.supabase));

export const saveGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        environment: z.enum(["sandbox", "production"]),
        phonePrefix: z.string().trim().max(10).nullable().optional(),
        callbackUrl: z.string().trim().max(300).nullable().optional(),
        config: z.record(z.string(), z.string()).default({}),
        isActive: z.boolean(),
        isDefault: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => saveGatewayRecord(context.supabase, context.userId, data));
