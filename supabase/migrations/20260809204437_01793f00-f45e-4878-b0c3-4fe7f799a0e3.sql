
-- PACKAGES
create table public.hotspot_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  kind text not null default 'time', -- time | data | combo
  duration_minutes integer,
  data_cap_mb bigint,
  price_ssp numeric(12,2) not null default 0,
  validity_days integer,
  download_kbps integer not null default 2048,
  upload_kbps integer not null default 1024,
  burst_download_kbps integer,
  burst_upload_kbps integer,
  burst_threshold_download_kbps integer,
  burst_threshold_upload_kbps integer,
  burst_time_seconds integer,
  fup_enabled boolean not null default false,
  fup_after_mb bigint,
  fup_download_kbps integer,
  fup_upload_kbps integer,
  shared_users integer not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.hotspot_packages to authenticated;
grant select on public.hotspot_packages to anon;
grant all on public.hotspot_packages to service_role;
alter table public.hotspot_packages enable row level security;
create policy "packages read" on public.hotspot_packages for select to authenticated using (true);
create policy "packages public read" on public.hotspot_packages for select to anon using (is_active);
create policy "packages insert" on public.hotspot_packages for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "packages update" on public.hotspot_packages for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "packages delete" on public.hotspot_packages for delete to authenticated using (public.is_admin(auth.uid()));
create trigger packages_touch before update on public.hotspot_packages for each row execute function public.touch_updated_at();

-- VOUCHER BATCHES
create table public.voucher_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  package_id uuid not null references public.hotspot_packages(id) on delete restrict,
  site_id uuid references public.sites(id) on delete set null,
  quantity integer not null default 0,
  code_format text not null default 'grouped', -- grouped | alnum
  code_length integer not null default 12,
  prefix text,
  expires_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.voucher_batches to authenticated;
grant all on public.voucher_batches to service_role;
alter table public.voucher_batches enable row level security;
create policy "batches read" on public.voucher_batches for select to authenticated using (true);
create policy "batches insert" on public.voucher_batches for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "batches update" on public.voucher_batches for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "batches delete" on public.voucher_batches for delete to authenticated using (public.is_admin(auth.uid()));
create trigger batches_touch before update on public.voucher_batches for each row execute function public.touch_updated_at();

-- VOUCHERS
create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  batch_id uuid references public.voucher_batches(id) on delete cascade,
  package_id uuid not null references public.hotspot_packages(id) on delete restrict,
  state text not null default 'unused', -- unused | active | expired | used
  price_ssp numeric(12,2) not null default 0,
  activated_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  data_used_mb numeric(14,2) not null default 0,
  minutes_used integer not null default 0,
  mac_address text,
  ip_address text,
  router_id uuid references public.routers(id) on delete set null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vouchers_batch_idx on public.vouchers(batch_id);
create index vouchers_state_idx on public.vouchers(state);
grant select, insert, update, delete on public.vouchers to authenticated;
grant all on public.vouchers to service_role;
alter table public.vouchers enable row level security;
create policy "vouchers read" on public.vouchers for select to authenticated using (true);
create policy "vouchers insert" on public.vouchers for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "vouchers update" on public.vouchers for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "vouchers delete" on public.vouchers for delete to authenticated using (public.is_admin(auth.uid()));
create trigger vouchers_touch before update on public.vouchers for each row execute function public.touch_updated_at();

-- HOTSPOT USERS
create table public.hotspot_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text,
  full_name text,
  phone text,
  email text,
  package_id uuid references public.hotspot_packages(id) on delete set null,
  status text not null default 'active', -- active | expired | suspended
  mac_address text,
  ip_address text,
  last_router_id uuid references public.routers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  data_used_mb numeric(14,2) not null default 0,
  minutes_used integer not null default 0,
  is_online boolean not null default false,
  activated_at timestamptz,
  expires_at timestamptz,
  last_seen_at timestamptz,
  source text not null default 'voucher', -- voucher | registered | trial
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.hotspot_users to authenticated;
grant all on public.hotspot_users to service_role;
alter table public.hotspot_users enable row level security;
create policy "hs users read" on public.hotspot_users for select to authenticated using (true);
create policy "hs users insert" on public.hotspot_users for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "hs users update" on public.hotspot_users for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "hs users delete" on public.hotspot_users for delete to authenticated using (public.is_admin(auth.uid()));
create trigger hs_users_touch before update on public.hotspot_users for each row execute function public.touch_updated_at();

-- SESSIONS
create table public.hotspot_sessions (
  id uuid primary key default gen_random_uuid(),
  hotspot_user_id uuid references public.hotspot_users(id) on delete cascade,
  voucher_id uuid references public.vouchers(id) on delete set null,
  router_id uuid references public.routers(id) on delete set null,
  username text,
  mac_address text,
  ip_address text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  rx_bytes bigint not null default 0,
  tx_bytes bigint not null default 0,
  rx_rate_kbps integer not null default 0,
  tx_rate_kbps integer not null default 0,
  is_active boolean not null default true
);
create index hs_sessions_active_idx on public.hotspot_sessions(is_active);
grant select, insert, update, delete on public.hotspot_sessions to authenticated;
grant all on public.hotspot_sessions to service_role;
alter table public.hotspot_sessions enable row level security;
create policy "sessions read" on public.hotspot_sessions for select to authenticated using (true);
create policy "sessions insert" on public.hotspot_sessions for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "sessions update" on public.hotspot_sessions for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));

-- PORTAL SETTINGS
create table public.portal_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default portal',
  site_id uuid references public.sites(id) on delete set null,
  theme text not null default 'default',
  primary_color text not null default '#f2b134',
  secondary_color text not null default '#0b1a2b',
  accent_color text not null default '#16a34a',
  logo_url text,
  favicon_url text,
  background_url text,
  custom_css text,
  welcome_title text not null default 'Welcome to Souk Junub WiFi',
  welcome_message text,
  terms_text text,
  allow_voucher boolean not null default true,
  allow_userpass boolean not null default true,
  allow_otp boolean not null default false,
  trial_enabled boolean not null default false,
  trial_mode text not null default 'one_click', -- one_click | otp | form
  trial_minutes integer not null default 30,
  trial_data_mb integer not null default 100,
  trial_max_per_device_per_day integer not null default 1,
  languages text[] not null default array['en','ar'],
  default_language text not null default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.portal_settings to authenticated;
grant select on public.portal_settings to anon;
grant all on public.portal_settings to service_role;
alter table public.portal_settings enable row level security;
create policy "portal read" on public.portal_settings for select to authenticated using (true);
create policy "portal public read" on public.portal_settings for select to anon using (is_active);
create policy "portal insert" on public.portal_settings for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "portal update" on public.portal_settings for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create trigger portal_touch before update on public.portal_settings for each row execute function public.touch_updated_at();

-- PORTAL ADS
create table public.portal_ads (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid references public.portal_settings(id) on delete cascade,
  title text not null,
  kind text not null default 'image', -- image | video | text
  asset_url text,
  body_text text,
  target_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  daily_start_time time,
  daily_end_time time,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.portal_ads to authenticated;
grant select on public.portal_ads to anon;
grant all on public.portal_ads to service_role;
alter table public.portal_ads enable row level security;
create policy "ads read" on public.portal_ads for select to authenticated using (true);
create policy "ads public read" on public.portal_ads for select to anon using (is_active);
create policy "ads insert" on public.portal_ads for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "ads update" on public.portal_ads for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "ads delete" on public.portal_ads for delete to authenticated using (public.is_admin(auth.uid()));
create trigger ads_touch before update on public.portal_ads for each row execute function public.touch_updated_at();

-- TRIAL GRANTS
create table public.trial_grants (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text,
  mac_address text,
  phone text,
  router_id uuid references public.routers(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz
);
create index trial_grants_device_idx on public.trial_grants(device_fingerprint);
grant select, insert on public.trial_grants to authenticated;
grant all on public.trial_grants to service_role;
alter table public.trial_grants enable row level security;
create policy "trials read" on public.trial_grants for select to authenticated using (true);
create policy "trials insert" on public.trial_grants for insert to authenticated with check (public.is_staff_writer(auth.uid()));

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  provider text not null default 'cash', -- mtn_momo | zain_cash | nips | tola | cash
  msisdn text,
  amount_ssp numeric(12,2) not null default 0,
  status text not null default 'pending', -- pending | processing | success | failed | refunded
  package_id uuid references public.hotspot_packages(id) on delete set null,
  voucher_id uuid references public.vouchers(id) on delete set null,
  hotspot_user_id uuid references public.hotspot_users(id) on delete set null,
  provider_reference text,
  failure_reason text,
  retry_count integer not null default 0,
  receipt_number text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_status_idx on public.payments(status);
create index payments_created_idx on public.payments(created_at);
grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments read" on public.payments for select to authenticated using (true);
create policy "payments insert" on public.payments for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "payments update" on public.payments for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- SEED PACKAGES
insert into public.hotspot_packages (name, kind, duration_minutes, data_cap_mb, price_ssp, validity_days, download_kbps, upload_kbps, sort_order) values
('1 Hour', 'time', 60, null, 50, 1, 2048, 1024, 1),
('3 Hours', 'time', 180, null, 120, 1, 2048, 1024, 2),
('6 Hours', 'time', 360, null, 200, 1, 3072, 1536, 3),
('12 Hours', 'time', 720, null, 250, 1, 3072, 1536, 4),
('1 Day', 'time', 1440, null, 300, 1, 5120, 2048, 5),
('3 Days', 'time', 4320, null, 750, 3, 5120, 2048, 6),
('7 Days', 'time', 10080, null, 1500, 7, 5120, 2048, 7),
('14 Days', 'time', 20160, null, 2800, 14, 10240, 5120, 8),
('30 Days', 'time', 43200, null, 5000, 30, 10240, 5120, 9),
('100 MB', 'data', null, 100, 60, 1, 2048, 1024, 10),
('500 MB', 'data', null, 500, 150, 3, 2048, 1024, 11),
('1 GB', 'data', null, 1024, 250, 7, 5120, 2048, 12),
('2 GB', 'data', null, 2048, 450, 7, 5120, 2048, 13),
('5 GB', 'data', null, 5120, 1000, 14, 5120, 2048, 14),
('10 GB', 'data', null, 10240, 1800, 30, 10240, 5120, 15),
('20 GB', 'data', null, 20480, 3200, 30, 10240, 5120, 16),
('50 GB', 'data', null, 51200, 7000, 30, 10240, 5120, 17),
('1 Day + 2GB', 'combo', 1440, 2048, 500, 1, 5120, 2048, 19),
('7 Days + 10GB', 'combo', 10080, 10240, 2500, 7, 10240, 5120, 20);

insert into public.hotspot_packages (name, kind, duration_minutes, data_cap_mb, price_ssp, validity_days, download_kbps, upload_kbps, fup_enabled, fup_after_mb, fup_download_kbps, fup_upload_kbps, sort_order) values
('Unlimited 30 Days', 'data', null, null, 9000, 30, 10240, 5120, true, 51200, 1024, 512, 18);

insert into public.portal_settings (name, welcome_message, terms_text) values
('Souk Junub Portal', 'Enter your voucher code to get online across South Sudan.', 'Fair usage applies. Vouchers are non-refundable.');
