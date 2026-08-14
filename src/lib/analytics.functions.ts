import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAnalyticsDashboard, fetchOperationalReports } from "./analytics.server";

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchAnalyticsDashboard(context.supabase));

export const getOperationalReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        from: z.string().trim().max(10).nullable().optional(),
        to: z.string().trim().max(10).nullable().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => fetchOperationalReports(context.supabase, data));
