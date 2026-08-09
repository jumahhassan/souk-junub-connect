# SOUK JUNUB — MikroTik Router Management (Phase 1)

## One important constraint, up front

This app's backend runs on an edge serverless runtime. It can make HTTPS calls, but it **cannot open a raw TCP socket to port 8728/8729**, and it cannot reach a router sitting behind NAT on a Juba tower. So the cloud app can never "dial" a MikroTik directly, and 5-second heartbeat polling from the cloud is not possible either.

The standard way this is solved (and how comparable ISP platforms do it) is a small **Souk Junub Agent**: a lightweight program the ISP installs once on any always-on machine on their network (a cheap mini-PC, a VPS, or a Linux box in the NOC). The agent speaks RouterOS API to the routers on the LAN, and speaks HTTPS *outbound* to this app. No public router ports, no VPN, no firewall holes.

```text
MikroTik routers  <--RouterOS API (LAN)-->  Souk Junub Agent  --HTTPS outbound-->  Cloud app
```

The agent does the 5s heartbeat locally and pushes a rollup every 15-30s, so the dashboard still feels live. This plan builds the **entire cloud side**, plus the agent protocol and the agent installer/pairing flow. The agent binary itself is a separate deliverable we scaffold after the cloud side is verified.

## What Phase 1 delivers

**Backend (Lovable Cloud)**
- Staff auth with roles (`owner`, `admin`, `noc`, `agent`, `technician`) in a separate `user_roles` table, RLS on everything.
- Tables: `sites` (router groups: Juba Central, Wau Tower 1...), `routers`, `router_agents` (paired agents + hashed tokens), `router_metrics` (time-series CPU/mem/latency/loss), `router_interfaces`, `access_points`, `ap_clients`, `router_backups`, `provisioning_jobs`, `provisioning_steps`, `router_events`, `alerts`, `audit_log`.
- Public agent endpoints under `/api/public/agent/*`: `register`, `heartbeat`, `metrics`, `commands` (long-poll for queued work), `command-result`, `backup-upload`. Every call authenticated by a per-agent bearer token, timing-safe compared; all input Zod-validated.
- Command queue: cloud enqueues work (provision, fetch config, backup, reboot, push script) and the agent pulls and reports back — this is what makes provisioning and rollback work through NAT.
- Offline detection: a router with no heartbeat past its threshold flips to Offline, writes a `router_events` row, and raises an alert.

**UI (all currency and reporting in SSP; English with i18n scaffolding)**
- `/` — SOUK JUNUB dashboard: routers online/offline, total active users, alerts feed, network-wide traffic.
- `/routers` — list grouped by site, with status, uptime, ROS version, active users, last seen.
- `/routers/$id` — identity, board, ROS version, uptime, CPU/memory gauges, latency and packet-loss charts, interface traffic graphs (WAN/LAN), wireless registration table, APs behind the router with signal/CCQ/client count, event timeline, backups list, PCC multi-WAN status when reported.
- `/routers/new` — 4-step provisioning wizard: connection details → verify and fetch router info → review the generated RouterOS script (hotspot server profile, user profile with bandwidth limits, walled garden, firewall, DHCP pool, NAT masquerade, restricted API user) → apply with live per-step progress and automatic rollback on failure.
- `/sites` — site/region management.
- `/agents` — install instructions, pairing code, agent status and version.
- `/alerts` — alert rules and history.

**Realtime**: dashboards subscribe to Cloud realtime on `routers`/`router_metrics`, so status changes appear without refresh.

## Deliberately deferred (and why)

- **Remote Winbox/Webfig tunnel** — needs a relay server with raw TCP forwarding, which cannot live in this app's runtime. It belongs in the agent as a reverse-tunnel feature; we design the session/audit tables now and wire the UI once the agent exists.
- **SMS and email alert delivery** — needs an SMS provider decision for MTN/Zain/Digitel routing. Alerts are recorded and shown in-app now; delivery is a follow-up step.
- **Billing, customers, plans, invoices, vouchers, payments** — the rest of the ISP platform, built after the router backbone is verified.

## Technical notes

- Lovable Cloud (Postgres + auth + realtime) gets enabled first; every public-schema table gets explicit GRANTs, RLS enabled, and role-scoped policies via a `has_role` security-definer function.
- Router admin credentials are **never** stored in the cloud. They are entered in the wizard, sent once to the agent through the command queue, used to create the restricted API user, and discarded. The cloud stores only the restricted API user reference.
- Agent tokens are stored hashed; the plaintext is shown once at pairing.
- Metrics are written as append-only rows with a retention/rollup job so charts stay fast.
- Server logic uses server functions for app reads/writes and `/api/public/agent/*` server routes for the agent, which is an external caller.
