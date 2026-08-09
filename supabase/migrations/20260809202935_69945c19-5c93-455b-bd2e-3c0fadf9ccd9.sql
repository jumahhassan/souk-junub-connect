-- ===== roles =====
create type public.app_role as enum ('owner','admin','noc','agent','technician');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff_writer(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin','noc'))
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create policy "profiles readable by staff" on public.profiles for select to authenticated using (true);
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "roles readable by staff" on public.user_roles for select to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;

  select not exists (select 1 from public.user_roles) into first_user;
  insert into public.user_roles (user_id, role)
  values (new.id, case when first_user then 'owner'::public.app_role else 'technician'::public.app_role end)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== sites =====
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sites to authenticated;
grant all on public.sites to service_role;
alter table public.sites enable row level security;
create policy "sites read" on public.sites for select to authenticated using (true);
create policy "sites write" on public.sites for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "sites update" on public.sites for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "sites delete" on public.sites for delete to authenticated using (public.is_admin(auth.uid()));
create trigger sites_touch before update on public.sites for each row execute function public.touch_updated_at();

-- ===== agents =====
create table public.router_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_id uuid references public.sites(id) on delete set null,
  token_hash text not null unique,
  token_prefix text not null,
  version text,
  status text not null default 'pending',
  last_seen_at timestamptz,
  ip_address text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.router_agents to authenticated;
grant all on public.router_agents to service_role;
alter table public.router_agents enable row level security;
create policy "agents read" on public.router_agents for select to authenticated using (true);
create policy "agents insert" on public.router_agents for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "agents update" on public.router_agents for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "agents delete" on public.router_agents for delete to authenticated using (public.is_admin(auth.uid()));
create trigger agents_touch before update on public.router_agents for each row execute function public.touch_updated_at();

-- ===== routers =====
create table public.routers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host text not null,
  api_port integer not null default 8728,
  use_ssl boolean not null default false,
  site_id uuid references public.sites(id) on delete set null,
  agent_id uuid references public.router_agents(id) on delete set null,
  status text not null default 'pending',
  identity text,
  ros_version text,
  board_name text,
  serial_number text,
  uptime_seconds bigint,
  cpu_load numeric,
  memory_used_mb numeric,
  memory_total_mb numeric,
  latency_ms numeric,
  packet_loss_pct numeric,
  active_users integer not null default 0,
  heartbeat_threshold_seconds integer not null default 60,
  last_seen_at timestamptz,
  api_username text,
  pcc_status jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.routers to authenticated;
grant all on public.routers to service_role;
alter table public.routers enable row level security;
create policy "routers read" on public.routers for select to authenticated using (true);
create policy "routers insert" on public.routers for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "routers update" on public.routers for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "routers delete" on public.routers for delete to authenticated using (public.is_admin(auth.uid()));
create trigger routers_touch before update on public.routers for each row execute function public.touch_updated_at();
create index routers_site_idx on public.routers(site_id);
create index routers_status_idx on public.routers(status);

-- ===== metrics =====
create table public.router_metrics (
  id bigserial primary key,
  router_id uuid not null references public.routers(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  cpu_load numeric,
  memory_used_mb numeric,
  latency_ms numeric,
  packet_loss_pct numeric,
  active_users integer,
  rx_bps bigint,
  tx_bps bigint
);
grant select on public.router_metrics to authenticated;
grant all on public.router_metrics to service_role;
alter table public.router_metrics enable row level security;
create policy "metrics read" on public.router_metrics for select to authenticated using (true);
create index router_metrics_router_time_idx on public.router_metrics(router_id, recorded_at desc);

-- ===== interfaces =====
create table public.router_interfaces (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references public.routers(id) on delete cascade,
  name text not null,
  type text,
  role text,
  running boolean not null default false,
  mac_address text,
  rx_bps bigint not null default 0,
  tx_bps bigint not null default 0,
  rx_bytes bigint,
  tx_bytes bigint,
  updated_at timestamptz not null default now(),
  unique (router_id, name)
);
grant select on public.router_interfaces to authenticated;
grant all on public.router_interfaces to service_role;
alter table public.router_interfaces enable row level security;
create policy "interfaces read" on public.router_interfaces for select to authenticated using (true);

-- ===== access points =====
create table public.access_points (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references public.routers(id) on delete cascade,
  mac_address text not null,
  name text,
  model text,
  ssid text,
  status text not null default 'online',
  signal_dbm numeric,
  ccq_pct numeric,
  tx_rate_mbps numeric,
  client_count integer not null default 0,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (router_id, mac_address)
);
grant select on public.access_points to authenticated;
grant all on public.access_points to service_role;
alter table public.access_points enable row level security;
create policy "aps read" on public.access_points for select to authenticated using (true);

create table public.ap_clients (
  id uuid primary key default gen_random_uuid(),
  access_point_id uuid not null references public.access_points(id) on delete cascade,
  mac_address text not null,
  ip_address text,
  hostname text,
  signal_dbm numeric,
  ccq_pct numeric,
  uptime_seconds bigint,
  rx_bytes bigint,
  tx_bytes bigint,
  last_seen_at timestamptz not null default now(),
  unique (access_point_id, mac_address)
);
grant select on public.ap_clients to authenticated;
grant all on public.ap_clients to service_role;
alter table public.ap_clients enable row level security;
create policy "ap clients read" on public.ap_clients for select to authenticated using (true);

-- ===== backups =====
create table public.router_backups (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references public.routers(id) on delete cascade,
  file_name text not null,
  size_bytes bigint,
  reason text not null default 'scheduled',
  content text,
  created_at timestamptz not null default now()
);
grant select on public.router_backups to authenticated;
grant all on public.router_backups to service_role;
alter table public.router_backups enable row level security;
create policy "backups read" on public.router_backups for select to authenticated using (true);

-- ===== provisioning =====
create table public.provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references public.routers(id) on delete cascade,
  status text not null default 'pending',
  script text,
  error text,
  rolled_back boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.provisioning_jobs to authenticated;
grant all on public.provisioning_jobs to service_role;
alter table public.provisioning_jobs enable row level security;
create policy "jobs read" on public.provisioning_jobs for select to authenticated using (true);
create policy "jobs insert" on public.provisioning_jobs for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "jobs update" on public.provisioning_jobs for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create trigger jobs_touch before update on public.provisioning_jobs for each row execute function public.touch_updated_at();

create table public.provisioning_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.provisioning_jobs(id) on delete cascade,
  step_key text not null,
  label text not null,
  position integer not null default 0,
  status text not null default 'pending',
  detail text,
  started_at timestamptz,
  finished_at timestamptz
);
grant select, insert, update on public.provisioning_steps to authenticated;
grant all on public.provisioning_steps to service_role;
alter table public.provisioning_steps enable row level security;
create policy "steps read" on public.provisioning_steps for select to authenticated using (true);
create policy "steps insert" on public.provisioning_steps for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "steps update" on public.provisioning_steps for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));

-- ===== command queue =====
create table public.agent_commands (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.router_agents(id) on delete cascade,
  router_id uuid references public.routers(id) on delete cascade,
  job_id uuid references public.provisioning_jobs(id) on delete set null,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  result jsonb,
  error text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.agent_commands to authenticated;
grant all on public.agent_commands to service_role;
alter table public.agent_commands enable row level security;
create policy "commands read" on public.agent_commands for select to authenticated using (true);
create policy "commands insert" on public.agent_commands for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create index agent_commands_queue_idx on public.agent_commands(agent_id, status);

-- ===== events / alerts / audit =====
create table public.router_events (
  id bigserial primary key,
  router_id uuid references public.routers(id) on delete cascade,
  agent_id uuid references public.router_agents(id) on delete set null,
  kind text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select on public.router_events to authenticated;
grant all on public.router_events to service_role;
alter table public.router_events enable row level security;
create policy "events read" on public.router_events for select to authenticated using (true);
create index router_events_time_idx on public.router_events(created_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  router_id uuid references public.routers(id) on delete cascade,
  severity text not null default 'warning',
  kind text not null,
  title text not null,
  detail text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "alerts read" on public.alerts for select to authenticated using (true);
create policy "alerts update" on public.alerts for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create index alerts_open_idx on public.alerts(created_at desc);

create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit read" on public.audit_log for select to authenticated using (public.is_admin(auth.uid()));
create policy "audit insert" on public.audit_log for insert to authenticated with check (auth.uid() = actor_id);

-- realtime
alter publication supabase_realtime add table public.routers;
alter publication supabase_realtime add table public.router_events;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.provisioning_steps;
alter publication supabase_realtime add table public.provisioning_jobs;