/* eslint-disable @typescript-eslint/no-explicit-any */
/** Server-only helpers behind the authenticated network server functions. */
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVISIONING_STEPS, buildProvisioningScript } from "./mikrotik-script";
import type { ProvisioningInput } from "./mikrotik-script";

type DB = SupabaseClient;

function unwrap(result: { data: any; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}


export async function assertWriter(db: DB, userId: string): Promise<void> {
  const { data, error } = await db.rpc("is_staff_writer", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You do not have permission to change network settings.");
}

export async function fetchOverview(db: DB) {
  const [routers, alerts, events, agents, sites] = await Promise.all([
    db
      .from("routers")
      .select(
        "id, name, status, active_users, cpu_load, latency_ms, packet_loss_pct, last_seen_at, heartbeat_threshold_seconds, site_id",
      ),
    db
      .from("alerts")
      .select("id, severity, kind, title, detail, created_at, acknowledged_at, resolved_at, router_id")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    db
      .from("router_events")
      .select("id, kind, message, created_at, router_id")
      .order("created_at", { ascending: false })
      .limit(15),
    db.from("router_agents").select("id, name, status, last_seen_at, version"),
    db.from("sites").select("id, name, region, city"),
  ]);

  const routerRows = unwrap(routers);
  const interfaces = unwrap(
    await db.from("router_interfaces").select("router_id, role, rx_bps, tx_bps"),
  );

  const throughput = interfaces
    .filter((i: any) => i.role === "wan")
    .reduce(
      (acc: any, i: any) => ({
        rx: acc.rx + Number(i.rx_bps ?? 0),
        tx: acc.tx + Number(i.tx_bps ?? 0),
      }),
      { rx: 0, tx: 0 },
    );

  return {
    routers: routerRows,
    alerts: unwrap(alerts),
    events: unwrap(events),
    agents: unwrap(agents),
    sites: unwrap(sites),
    throughput,
  };
}

export async function fetchRouters(db: DB) {
  const routers = unwrap(
    await db
      .from("routers")
      .select(
        "id, name, host, api_port, status, identity, ros_version, board_name, uptime_seconds, cpu_load, memory_used_mb, memory_total_mb, latency_ms, packet_loss_pct, active_users, last_seen_at, heartbeat_threshold_seconds, site_id, agent_id",
      )
      .order("name"),
  );
  const sites = unwrap(await db.from("sites").select("id, name, region, city").order("name"));
  return { routers, sites };
}

export async function fetchRouterDetail(db: DB, routerId: string) {
  const router = unwrap(await db.from("routers").select("*").eq("id", routerId).maybeSingle());
  if (!router) throw new Error("Router not found");

  const [site, agent, interfaces, aps, events, backups, metrics, jobs] = await Promise.all([
    router.site_id
      ? db.from("sites").select("id, name, region, city").eq("id", router.site_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    router.agent_id
      ? db
          .from("router_agents")
          .select("id, name, status, version, last_seen_at")
          .eq("id", router.agent_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("router_interfaces").select("*").eq("router_id", routerId).order("name"),
    db.from("access_points").select("*").eq("router_id", routerId).order("name"),
    db
      .from("router_events")
      .select("id, kind, message, created_at")
      .eq("router_id", routerId)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("router_backups")
      .select("id, file_name, size_bytes, reason, created_at")
      .eq("router_id", routerId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("router_metrics")
      .select("recorded_at, cpu_load, memory_used_mb, latency_ms, packet_loss_pct, active_users, rx_bps, tx_bps")
      .eq("router_id", routerId)
      .order("recorded_at", { ascending: false })
      .limit(120),
    db
      .from("provisioning_jobs")
      .select("id, status, error, rolled_back, created_at, finished_at")
      .eq("router_id", routerId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const apRows = unwrap(aps);
  const apClients = apRows.length
    ? unwrap(
        await db
          .from("ap_clients")
          .select("*")
          .in(
            "access_point_id",
            apRows.map((a: any) => a.id),
          ),
      )
    : [];

  return {
    router,
    site: site.data ?? null,
    agent: agent.data ?? null,
    interfaces: unwrap(interfaces),
    accessPoints: apRows,
    apClients,
    events: unwrap(events),
    backups: unwrap(backups),
    metrics: unwrap(metrics).slice().reverse(),
    jobs: unwrap(jobs),
  };
}

export async function fetchAgents(db: DB) {
  const agents = unwrap(
    await db
      .from("router_agents")
      .select("id, name, status, version, last_seen_at, ip_address, token_prefix, site_id, created_at")
      .order("created_at", { ascending: false }),
  );
  const routers = unwrap(await db.from("routers").select("id, name, agent_id"));
  const sites = unwrap(await db.from("sites").select("id, name").order("name"));
  return { agents, routers, sites };
}

export async function createAgentRecord(
  db: DB,
  userId: string,
  input: { name: string; siteId: string | null },
) {
  await assertWriter(db, userId);
  const token = `sj_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const agent = unwrap(
    await db
      .from("router_agents")
      .insert({
        name: input.name,
        site_id: input.siteId,
        token_hash: tokenHash,
        token_prefix: token.slice(0, 11),
        created_by: userId,
        status: "pending",
      })
      .select("id, name, token_prefix")
      .single(),
  );
  await db.from("audit_log").insert({
    actor_id: userId,
    action: "agent.created",
    entity: "router_agents",
    entity_id: agent.id,
  });
  return { agent, token };
}

export async function deleteAgentRecord(db: DB, userId: string, agentId: string) {
  await assertWriter(db, userId);
  const { error } = await db.from("router_agents").delete().eq("id", agentId);
  if (error) throw new Error(error.message);
  await db.from("audit_log").insert({
    actor_id: userId,
    action: "agent.deleted",
    entity: "router_agents",
    entity_id: agentId,
  });
  return { ok: true };
}

export async function saveSiteRecord(
  db: DB,
  userId: string,
  input: { id?: string | undefined; name: string; region: string | null; city: string | null; notes: string | null },
) {
  await assertWriter(db, userId);
  const payload = {
    name: input.name,
    region: input.region,
    city: input.city,
    notes: input.notes,
  };
  const row = input.id
    ? unwrap(await db.from("sites").update(payload).eq("id", input.id).select("*").single())
    : unwrap(await db.from("sites").insert(payload).select("*").single());
  return row;
}

export async function deleteSiteRecord(db: DB, userId: string, siteId: string) {
  await assertWriter(db, userId);
  const { error } = await db.from("sites").delete().eq("id", siteId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type ProvisionRequest = {
  name: string;
  host: string;
  apiPort: number;
  useSsl: boolean;
  siteId: string | null;
  agentId: string;
  heartbeatThresholdSeconds: number;
  config: ProvisioningInput;
  /** Used once by the agent to create the restricted API user, never persisted. */
  adminUsername: string;
  adminPassword: string;
};

export async function provisionRouterRecord(db: DB, userId: string, input: ProvisionRequest) {
  await assertWriter(db, userId);

  const router = unwrap(
    await db
      .from("routers")
      .insert({
        name: input.name,
        host: input.host,
        api_port: input.apiPort,
        use_ssl: input.useSsl,
        site_id: input.siteId,
        agent_id: input.agentId,
        heartbeat_threshold_seconds: input.heartbeatThresholdSeconds,
        status: "provisioning",
        api_username: input.config.apiUsername,
      })
      .select("*")
      .single(),
  );

  const script = buildProvisioningScript(input.config);

  const job = unwrap(
    await db
      .from("provisioning_jobs")
      .insert({
        router_id: router.id,
        status: "running",
        script,
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single(),
  );

  await db.from("provisioning_steps").insert(
    PROVISIONING_STEPS.map((step, index) => ({
      job_id: job.id,
      step_key: step.key,
      label: step.label,
      position: index,
      status: "pending",
    })),
  );

  await db.from("agent_commands").insert({
    agent_id: input.agentId,
    router_id: router.id,
    job_id: job.id,
    command: "provision_router",
    payload: {
      host: input.host,
      api_port: input.apiPort,
      use_ssl: input.useSsl,
      admin_username: input.adminUsername,
      admin_password: input.adminPassword,
      script,
      steps: PROVISIONING_STEPS.map((s) => s.key),
      rollback_on_failure: true,
    },
  });

  await db.from("router_events").insert({
    router_id: router.id,
    kind: "provisioning_started",
    message: `Auto-provisioning queued for ${router.name}`,
  });

  await db.from("audit_log").insert({
    actor_id: userId,
    action: "router.provision_queued",
    entity: "routers",
    entity_id: router.id,
  });

  return { routerId: router.id as string, jobId: job.id as string };
}

export async function fetchProvisioningJob(db: DB, jobId: string) {
  const job = unwrap(await db.from("provisioning_jobs").select("*").eq("id", jobId).maybeSingle());
  if (!job) throw new Error("Provisioning job not found");
  const steps = unwrap(
    await db.from("provisioning_steps").select("*").eq("job_id", jobId).order("position"),
  );
  return { job, steps };
}

export async function queueRouterCommand(
  db: DB,
  userId: string,
  input: { routerId: string; command: string },
) {
  await assertWriter(db, userId);
  const router = unwrap(
    await db.from("routers").select("id, name, agent_id").eq("id", input.routerId).maybeSingle(),
  );
  if (!router?.agent_id) throw new Error("This router has no paired agent.");
  unwrap(
    await db
      .from("agent_commands")
      .insert({
        agent_id: router.agent_id,
        router_id: router.id,
        command: input.command,
        payload: {},
      })
      .select("id")
      .single(),
  );
  await db.from("audit_log").insert({
    actor_id: userId,
    action: `router.${input.command}`,
    entity: "routers",
    entity_id: router.id,
  });
  return { ok: true };
}

export async function fetchAlerts(db: DB) {
  const alerts = unwrap(
    await db
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150),
  );
  const routers = unwrap(await db.from("routers").select("id, name"));
  return { alerts, routers };
}

export async function acknowledgeAlertRecord(db: DB, userId: string, alertId: string) {
  await assertWriter(db, userId);
  const { error } = await db
    .from("alerts")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
    .eq("id", alertId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function fetchViewer(db: DB, userId: string) {
  const profile = unwrap(
    await db.from("profiles").select("id, full_name, phone, job_title").eq("id", userId).maybeSingle(),
  );
  const roles = unwrap(await db.from("user_roles").select("role").eq("user_id", userId));
  return { profile, roles: roles.map((r: any) => r.role as string) };
}
