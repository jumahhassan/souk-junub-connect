/**
 * Server-only implementation of the Souk Junub Agent protocol.
 *
 * The cloud can never dial a MikroTik directly (no raw TCP from the edge
 * runtime, routers sit behind NAT). Instead an on-site agent speaks RouterOS
 * API on the LAN and talks to these endpoints over outbound HTTPS.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function getAdmin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export type AgentContext = {
  agent: { id: string; name: string; site_id: string | null };
  admin: SupabaseClient;
};

/** Validates the agent bearer token with a timing-safe hash comparison. */
export async function authenticateAgent(request: Request): Promise<AgentContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length < 20) return json({ error: "Missing agent token" }, 401);

  const admin = await getAdmin();
  const hash = hashToken(token);
  const { data, error } = await admin
    .from("router_agents")
    .select("id, name, site_id, token_hash")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error) return json({ error: "Authentication failed" }, 500);
  if (!data || !safeEqual(data.token_hash as string, hash)) {
    return json({ error: "Invalid agent token" }, 401);
  }
  return { agent: { id: data.id, name: data.name, site_id: data.site_id }, admin };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const registerSchema = z.object({
  version: z.string().min(1).max(40),
  hostname: z.string().max(120).optional(),
  ip_address: z.string().max(60).optional(),
});

export async function handleRegister(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;
  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);

  await ctx.admin
    .from("router_agents")
    .update({
      version: parsed.data.version,
      ip_address: parsed.data.ip_address ?? null,
      status: "online",
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", ctx.agent.id);

  const { data: routers } = await ctx.admin
    .from("routers")
    .select("id, name, host, api_port, use_ssl, api_username, heartbeat_threshold_seconds")
    .eq("agent_id", ctx.agent.id);

  return json({
    agent: { id: ctx.agent.id, name: ctx.agent.name },
    poll_interval_seconds: 5,
    push_interval_seconds: 20,
    routers: routers ?? [],
  });
}

const heartbeatSchema = z.object({
  routers: z
    .array(
      z.object({
        router_id: z.string().uuid(),
        reachable: z.boolean(),
        identity: z.string().max(120).nullish(),
        ros_version: z.string().max(60).nullish(),
        board_name: z.string().max(80).nullish(),
        serial_number: z.string().max(80).nullish(),
        uptime_seconds: z.number().int().min(0).max(4_000_000_000).nullish(),
        cpu_load: z.number().min(0).max(100).nullish(),
        memory_used_mb: z.number().min(0).max(1_000_000).nullish(),
        memory_total_mb: z.number().min(0).max(1_000_000).nullish(),
        latency_ms: z.number().min(0).max(60_000).nullish(),
        packet_loss_pct: z.number().min(0).max(100).nullish(),
        active_users: z.number().int().min(0).max(1_000_000).nullish(),
        pcc_status: z.record(z.unknown()).nullish(),
      }),
    )
    .max(500),
});

export async function handleHeartbeat(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;
  const parsed = heartbeatSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);

  const now = new Date().toISOString();
  await ctx.admin
    .from("router_agents")
    .update({ last_seen_at: now, status: "online" })
    .eq("id", ctx.agent.id);

  for (const r of parsed.data.routers) {
    const { data: existing } = await ctx.admin
      .from("routers")
      .select("id, status, name")
      .eq("id", r.router_id)
      .eq("agent_id", ctx.agent.id)
      .maybeSingle();
    if (!existing) continue;

    const nextStatus = r.reachable ? "online" : "offline";
    await ctx.admin
      .from("routers")
      .update({
        status: nextStatus,
        identity: r.identity ?? undefined,
        ros_version: r.ros_version ?? undefined,
        board_name: r.board_name ?? undefined,
        serial_number: r.serial_number ?? undefined,
        uptime_seconds: r.uptime_seconds ?? undefined,
        cpu_load: r.cpu_load ?? undefined,
        memory_used_mb: r.memory_used_mb ?? undefined,
        memory_total_mb: r.memory_total_mb ?? undefined,
        latency_ms: r.latency_ms ?? undefined,
        packet_loss_pct: r.packet_loss_pct ?? undefined,
        active_users: r.active_users ?? undefined,
        pcc_status: r.pcc_status ?? undefined,
        last_seen_at: r.reachable ? now : undefined,
      })
      .eq("id", r.router_id);

    if (existing.status !== nextStatus && existing.status !== "pending") {
      await recordTransition(ctx.admin, r.router_id, existing.name as string, nextStatus);
    }
  }

  return json({ ok: true, received: parsed.data.routers.length });
}

export async function recordTransition(
  admin: SupabaseClient,
  routerId: string,
  routerName: string,
  status: string,
): Promise<void> {
  const online = status === "online";
  await admin.from("router_events").insert({
    router_id: routerId,
    kind: online ? "router_online" : "router_offline",
    message: online ? `${routerName} is back online` : `${routerName} stopped responding`,
  });
  if (online) {
    await admin
      .from("alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("router_id", routerId)
      .eq("kind", "router_offline")
      .is("resolved_at", null);
  } else {
    await admin.from("alerts").insert({
      router_id: routerId,
      severity: "critical",
      kind: "router_offline",
      title: `${routerName} is offline`,
      detail: "No heartbeat received from the on-site agent within the configured threshold.",
    });
  }
}

const metricsSchema = z.object({
  router_id: z.string().uuid(),
  samples: z
    .array(
      z.object({
        recorded_at: z.string().datetime().optional(),
        cpu_load: z.number().min(0).max(100).nullish(),
        memory_used_mb: z.number().min(0).nullish(),
        latency_ms: z.number().min(0).nullish(),
        packet_loss_pct: z.number().min(0).max(100).nullish(),
        active_users: z.number().int().min(0).nullish(),
        rx_bps: z.number().int().min(0).nullish(),
        tx_bps: z.number().int().min(0).nullish(),
      }),
    )
    .max(120),
  interfaces: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        type: z.string().max(40).nullish(),
        role: z.enum(["wan", "lan", "other"]).nullish(),
        running: z.boolean().default(false),
        mac_address: z.string().max(40).nullish(),
        rx_bps: z.number().int().min(0).default(0),
        tx_bps: z.number().int().min(0).default(0),
        rx_bytes: z.number().int().min(0).nullish(),
        tx_bytes: z.number().int().min(0).nullish(),
      }),
    )
    .max(200)
    .default([]),
  access_points: z
    .array(
      z.object({
        mac_address: z.string().min(6).max(40),
        name: z.string().max(80).nullish(),
        model: z.string().max(80).nullish(),
        ssid: z.string().max(80).nullish(),
        status: z.string().max(20).default("online"),
        signal_dbm: z.number().min(-120).max(0).nullish(),
        ccq_pct: z.number().min(0).max(100).nullish(),
        tx_rate_mbps: z.number().min(0).nullish(),
        clients: z
          .array(
            z.object({
              mac_address: z.string().min(6).max(40),
              ip_address: z.string().max(60).nullish(),
              hostname: z.string().max(120).nullish(),
              signal_dbm: z.number().min(-120).max(0).nullish(),
              ccq_pct: z.number().min(0).max(100).nullish(),
              uptime_seconds: z.number().int().min(0).nullish(),
              rx_bytes: z.number().int().min(0).nullish(),
              tx_bytes: z.number().int().min(0).nullish(),
            }),
          )
          .max(300)
          .default([]),
      }),
    )
    .max(200)
    .default([]),
});

export async function handleMetrics(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;
  const parsed = metricsSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);
  const body = parsed.data;

  const { data: router } = await ctx.admin
    .from("routers")
    .select("id")
    .eq("id", body.router_id)
    .eq("agent_id", ctx.agent.id)
    .maybeSingle();
  if (!router) return json({ error: "Router not assigned to this agent" }, 403);

  if (body.samples.length > 0) {
    await ctx.admin.from("router_metrics").insert(
      body.samples.map((s) => ({
        router_id: body.router_id,
        recorded_at: s.recorded_at ?? new Date().toISOString(),
        cpu_load: s.cpu_load ?? null,
        memory_used_mb: s.memory_used_mb ?? null,
        latency_ms: s.latency_ms ?? null,
        packet_loss_pct: s.packet_loss_pct ?? null,
        active_users: s.active_users ?? null,
        rx_bps: s.rx_bps ?? null,
        tx_bps: s.tx_bps ?? null,
      })),
    );
  }

  if (body.interfaces.length > 0) {
    await ctx.admin.from("router_interfaces").upsert(
      body.interfaces.map((i) => ({
        router_id: body.router_id,
        name: i.name,
        type: i.type ?? null,
        role: i.role ?? null,
        running: i.running,
        mac_address: i.mac_address ?? null,
        rx_bps: i.rx_bps,
        tx_bps: i.tx_bps,
        rx_bytes: i.rx_bytes ?? null,
        tx_bytes: i.tx_bytes ?? null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "router_id,name" },
    );
  }

  for (const ap of body.access_points) {
    const { data: saved } = await ctx.admin
      .from("access_points")
      .upsert(
        {
          router_id: body.router_id,
          mac_address: ap.mac_address,
          name: ap.name ?? null,
          model: ap.model ?? null,
          ssid: ap.ssid ?? null,
          status: ap.status,
          signal_dbm: ap.signal_dbm ?? null,
          ccq_pct: ap.ccq_pct ?? null,
          tx_rate_mbps: ap.tx_rate_mbps ?? null,
          client_count: ap.clients.length,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "router_id,mac_address" },
      )
      .select("id")
      .maybeSingle();

    if (saved && ap.clients.length > 0) {
      await ctx.admin.from("ap_clients").upsert(
        ap.clients.map((c) => ({
          access_point_id: saved.id,
          mac_address: c.mac_address,
          ip_address: c.ip_address ?? null,
          hostname: c.hostname ?? null,
          signal_dbm: c.signal_dbm ?? null,
          ccq_pct: c.ccq_pct ?? null,
          uptime_seconds: c.uptime_seconds ?? null,
          rx_bytes: c.rx_bytes ?? null,
          tx_bytes: c.tx_bytes ?? null,
          last_seen_at: new Date().toISOString(),
        })),
        { onConflict: "access_point_id,mac_address" },
      );
    }
  }

  return json({ ok: true });
}

/** Agents long-poll this to pick up queued work (provision, backup, scripts). */
export async function handleCommands(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;

  const { data: queued } = await ctx.admin
    .from("agent_commands")
    .select("id, router_id, job_id, command, payload")
    .eq("agent_id", ctx.agent.id)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  const commands = queued ?? [];
  if (commands.length > 0) {
    await ctx.admin
      .from("agent_commands")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .in(
        "id",
        commands.map((c) => c.id),
      );
  }
  return json({ commands });
}

const resultSchema = z.object({
  command_id: z.string().uuid(),
  status: z.enum(["succeeded", "failed", "rolled_back"]),
  result: z.record(z.unknown()).nullish(),
  error: z.string().max(4000).nullish(),
  steps: z
    .array(
      z.object({
        step_key: z.string().max(60),
        status: z.enum(["pending", "running", "succeeded", "failed", "skipped", "rolled_back"]),
        detail: z.string().max(2000).nullish(),
      }),
    )
    .max(40)
    .default([]),
  router: z
    .object({
      identity: z.string().max(120).nullish(),
      ros_version: z.string().max(60).nullish(),
      board_name: z.string().max(80).nullish(),
      serial_number: z.string().max(80).nullish(),
      api_username: z.string().max(60).nullish(),
      status: z.enum(["pending", "provisioning", "online", "offline", "error"]).nullish(),
    })
    .nullish(),
});

export async function handleCommandResult(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;
  const parsed = resultSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);
  const body = parsed.data;

  const { data: command } = await ctx.admin
    .from("agent_commands")
    .select("id, router_id, job_id")
    .eq("id", body.command_id)
    .eq("agent_id", ctx.agent.id)
    .maybeSingle();
  if (!command) return json({ error: "Unknown command" }, 404);

  await ctx.admin
    .from("agent_commands")
    .update({
      status: body.status,
      result: body.result ?? null,
      error: body.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", command.id);

  for (const step of body.steps) {
    await ctx.admin
      .from("provisioning_steps")
      .update({
        status: step.status,
        detail: step.detail ?? null,
        finished_at: ["succeeded", "failed", "rolled_back", "skipped"].includes(step.status)
          ? new Date().toISOString()
          : null,
        started_at: step.status === "running" ? new Date().toISOString() : undefined,
      })
      .eq("job_id", command.job_id ?? "")
      .eq("step_key", step.step_key);
  }

  if (command.job_id) {
    await ctx.admin
      .from("provisioning_jobs")
      .update({
        status: body.status === "succeeded" ? "succeeded" : "failed",
        error: body.error ?? null,
        rolled_back: body.status === "rolled_back",
        finished_at: new Date().toISOString(),
      })
      .eq("id", command.job_id);
  }

  if (command.router_id && body.router) {
    await ctx.admin
      .from("routers")
      .update({
        identity: body.router.identity ?? undefined,
        ros_version: body.router.ros_version ?? undefined,
        board_name: body.router.board_name ?? undefined,
        serial_number: body.router.serial_number ?? undefined,
        api_username: body.router.api_username ?? undefined,
        status: body.router.status ?? undefined,
      })
      .eq("id", command.router_id);
  }

  return json({ ok: true });
}

const backupSchema = z.object({
  router_id: z.string().uuid(),
  file_name: z.string().min(1).max(160),
  reason: z.enum(["scheduled", "pre_change", "post_change", "manual"]).default("scheduled"),
  size_bytes: z.number().int().min(0).nullish(),
  content: z.string().max(2_000_000).nullish(),
});

export async function handleBackupUpload(request: Request): Promise<Response> {
  const ctx = await authenticateAgent(request);
  if (ctx instanceof Response) return ctx;
  const parsed = backupSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);

  const { data: router } = await ctx.admin
    .from("routers")
    .select("id")
    .eq("id", parsed.data.router_id)
    .eq("agent_id", ctx.agent.id)
    .maybeSingle();
  if (!router) return json({ error: "Router not assigned to this agent" }, 403);

  await ctx.admin.from("router_backups").insert({
    router_id: parsed.data.router_id,
    file_name: parsed.data.file_name,
    reason: parsed.data.reason,
    size_bytes: parsed.data.size_bytes ?? null,
    content: parsed.data.content ?? null,
  });

  return json({ ok: true });
}

/** Flips routers to offline when their heartbeat threshold has elapsed. */
export async function sweepOfflineRouters(): Promise<Response> {
  const admin = await getAdmin();
  const { data: routers } = await admin
    .from("routers")
    .select("id, name, status, last_seen_at, heartbeat_threshold_seconds")
    .in("status", ["online", "provisioning"]);

  let flipped = 0;
  for (const r of routers ?? []) {
    const last = r.last_seen_at ? new Date(r.last_seen_at as string).getTime() : 0;
    const threshold = (r.heartbeat_threshold_seconds as number) * 1000;
    if (Date.now() - last <= threshold) continue;
    await admin.from("routers").update({ status: "offline" }).eq("id", r.id);
    await recordTransition(admin, r.id as string, r.name as string, "offline");
    flipped += 1;
  }

  await admin
    .from("router_agents")
    .update({ status: "offline" })
    .eq("status", "online")
    .lt("last_seen_at", new Date(Date.now() - 120_000).toISOString());

  return json({ ok: true, flipped });
}
