import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  acknowledgeAlertRecord,
  createAgentRecord,
  deleteAgentRecord,
  deleteSiteRecord,
  fetchAgents,
  fetchAlerts,
  fetchOverview,
  fetchProvisioningJob,
  fetchRouterDetail,
  fetchRouters,
  fetchViewer,
  provisionRouterRecord,
  queueRouterCommand,
  saveSiteRecord,
} from "./network.server";

export const getViewer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchViewer(context.supabase, context.userId));

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchOverview(context.supabase));

export const getRouters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchRouters(context.supabase));

export const getRouterDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ routerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => fetchRouterDetail(context.supabase, data.routerId));

export const getAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchAgents(context.supabase));

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ name: z.string().trim().min(2).max(80), siteId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    createAgentRecord(context.supabase, context.userId, data),
  );

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agentId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deleteAgentRecord(context.supabase, context.userId, data.agentId),
  );

export const saveSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(80),
        region: z.string().trim().max(80).nullable(),
        city: z.string().trim().max(80).nullable(),
        notes: z.string().trim().max(500).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveSiteRecord(context.supabase, context.userId, data));

export const deleteSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ siteId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deleteSiteRecord(context.supabase, context.userId, data.siteId),
  );

export const provisionRouter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        host: z.string().trim().min(3).max(120),
        apiPort: z.number().int().min(1).max(65535),
        useSsl: z.boolean(),
        siteId: z.string().uuid().nullable(),
        agentId: z.string().uuid(),
        heartbeatThresholdSeconds: z.number().int().min(15).max(3600),
        adminUsername: z.string().trim().min(1).max(60),
        adminPassword: z.string().min(1).max(200),
        config: z.object({
          routerName: z.string().trim().min(2).max(80),
          hotspotInterface: z.string().trim().min(1).max(40),
          hotspotNetwork: z.string().trim().min(7).max(40),
          gatewayAddress: z.string().trim().min(7).max(40),
          poolStart: z.string().trim().min(7).max(40),
          poolEnd: z.string().trim().min(7).max(40),
          dnsServers: z.string().trim().min(7).max(80),
          wanInterface: z.string().trim().min(1).max(40),
          rateLimit: z.string().trim().min(3).max(30),
          sessionTimeout: z.string().trim().min(1).max(20),
          walledGarden: z.array(z.string().trim().min(1).max(120)).max(40),
          apiUsername: z.string().trim().min(1).max(60),
        }),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    provisionRouterRecord(context.supabase, context.userId, data),
  );

export const getProvisioningJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => fetchProvisioningJob(context.supabase, data.jobId));

export const sendRouterCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        routerId: z.string().uuid(),
        command: z.enum(["backup_config", "resync", "reboot", "fetch_config"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    queueRouterCommand(context.supabase, context.userId, data),
  );

export const getAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchAlerts(context.supabase));

export const acknowledgeAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ alertId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    acknowledgeAlertRecord(context.supabase, context.userId, data.alertId),
  );
