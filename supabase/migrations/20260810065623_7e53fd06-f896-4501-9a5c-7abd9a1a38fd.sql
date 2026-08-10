-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  national_id text,
  address text,
  area text,
  customer_type text not null default 'hotspot',
  status text not null default 'active',
  router_id uuid references public.routers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  hotspot_user_id uuid references public.hotspot_users(id) on delete set null,
  pppoe_subscriber_id uuid references public.pppoe_subscribers(id) on delete set null,
  balance_ssp numeric not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_phone_idx on public.customers (phone);
create index customers_name_idx on public.customers (full_name);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "staff read customers" on public.customers for select to authenticated using (true);
create policy "writers insert customers" on public.customers for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "writers update customers" on public.customers for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admins delete customers" on public.customers for delete to authenticated using (public.is_admin(auth.uid()));
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

-- SUPPORT TICKETS
create sequence if not exists public.ticket_seq;
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('TCK-' || lpad(nextval('public.ticket_seq')::text, 6, '0')),
  customer_id uuid references public.customers(id) on delete set null,
  router_id uuid references public.routers(id) on delete set null,
  subject text not null,
  description text,
  category text not null default 'general',
  priority text not null default 'medium',
  status text not null default 'open',
  source text not null default 'portal',
  assigned_to uuid references auth.users(id) on delete set null,
  sla_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "staff read tickets" on public.support_tickets for select to authenticated using (true);
create policy "staff insert tickets" on public.support_tickets for insert to authenticated with check (auth.uid() is not null);
create policy "writers update tickets" on public.support_tickets for update to authenticated using (public.is_staff_writer(auth.uid()) or assigned_to = auth.uid()) with check (public.is_staff_writer(auth.uid()) or assigned_to = auth.uid());
create policy "admins delete tickets" on public.support_tickets for delete to authenticated using (public.is_admin(auth.uid()));
create trigger tickets_touch before update on public.support_tickets for each row execute function public.touch_updated_at();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null,
  is_internal boolean not null default false,
  channel text not null default 'portal',
  created_at timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id);
grant select, insert on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;
alter table public.ticket_messages enable row level security;
create policy "staff read ticket messages" on public.ticket_messages for select to authenticated using (true);
create policy "staff insert ticket messages" on public.ticket_messages for insert to authenticated with check (auth.uid() is not null);

-- MESSAGING PROVIDERS
create table public.messaging_providers (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'sms',
  provider text not null,
  label text not null,
  sender_id text,
  base_url text,
  config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messaging_providers to authenticated;
grant all on public.messaging_providers to service_role;
alter table public.messaging_providers enable row level security;
create policy "staff read providers" on public.messaging_providers for select to authenticated using (true);
create policy "writers insert providers" on public.messaging_providers for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "writers update providers" on public.messaging_providers for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admins delete providers" on public.messaging_providers for delete to authenticated using (public.is_admin(auth.uid()));
create trigger providers_touch before update on public.messaging_providers for each row execute function public.touch_updated_at();

-- TEMPLATES
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  channel text not null default 'sms',
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.message_templates to authenticated;
grant all on public.message_templates to service_role;
alter table public.message_templates enable row level security;
create policy "staff read templates" on public.message_templates for select to authenticated using (true);
create policy "writers insert templates" on public.message_templates for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "writers update templates" on public.message_templates for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admins delete templates" on public.message_templates for delete to authenticated using (public.is_admin(auth.uid()));
create trigger templates_touch before update on public.message_templates for each row execute function public.touch_updated_at();

-- CAMPAIGNS
create table public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'sms',
  body text not null,
  audience jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  status text not null default 'draft',
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.message_campaigns to authenticated;
grant all on public.message_campaigns to service_role;
alter table public.message_campaigns enable row level security;
create policy "staff read campaigns" on public.message_campaigns for select to authenticated using (true);
create policy "writers insert campaigns" on public.message_campaigns for insert to authenticated with check (public.is_staff_writer(auth.uid()));
create policy "writers update campaigns" on public.message_campaigns for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admins delete campaigns" on public.message_campaigns for delete to authenticated using (public.is_admin(auth.uid()));
create trigger campaigns_touch before update on public.message_campaigns for each row execute function public.touch_updated_at();

-- MESSAGE LOG
create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  campaign_id uuid references public.message_campaigns(id) on delete set null,
  template_key text,
  channel text not null default 'sms',
  provider text,
  to_address text not null,
  body text not null,
  status text not null default 'queued',
  scheduled_for timestamptz,
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index message_log_customer_idx on public.message_log (customer_id);
create index message_log_status_idx on public.message_log (status, scheduled_for);
grant select, insert, update on public.message_log to authenticated;
grant all on public.message_log to service_role;
alter table public.message_log enable row level security;
create policy "staff read message log" on public.message_log for select to authenticated using (true);
create policy "staff insert message log" on public.message_log for insert to authenticated with check (auth.uid() is not null);
create policy "writers update message log" on public.message_log for update to authenticated using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));

-- Seed default templates
insert into public.message_templates (key, name, channel, subject, body) values
  ('expiry_3d', 'Expiry reminder - 3 days', 'sms', null, 'SOUK JUNUB: Hi {{name}}, your {{package}} plan expires on {{expiry}}. Renew early to stay online. Dial or visit our portal to pay {{amount}} SSP.'),
  ('expiry_1d', 'Expiry reminder - 1 day', 'sms', null, 'SOUK JUNUB: Hi {{name}}, your internet expires tomorrow ({{expiry}}). Renew now for {{amount}} SSP to avoid disconnection.'),
  ('expiry_today', 'Expiry reminder - today', 'sms', null, 'SOUK JUNUB: Hi {{name}}, your plan expires today. Renew for {{amount}} SSP to keep your connection active.'),
  ('payment_confirmed', 'Payment confirmation', 'sms', null, 'SOUK JUNUB: Payment of {{amount}} SSP received. Ref {{reference}}. Your {{package}} plan is active until {{expiry}}. Thank you.'),
  ('voucher_delivery', 'Voucher delivery', 'whatsapp', null, 'SOUK JUNUB: Your WiFi voucher code is {{code}} ({{package}}). Connect to Souk Junub WiFi and enter the code to get online.'),
  ('package_change', 'Package change', 'sms', null, 'SOUK JUNUB: Hi {{name}}, your plan changed to {{package}}. New speed and validity are active now.'),
  ('ticket_opened', 'Ticket opened', 'sms', null, 'SOUK JUNUB Support: Ticket {{ticket}} created for "{{subject}}". Our technician will contact you shortly.'),
  ('ticket_resolved', 'Ticket resolved', 'sms', null, 'SOUK JUNUB Support: Ticket {{ticket}} has been resolved. Reply if the issue continues.');

-- Seed South Sudan messaging providers
insert into public.messaging_providers (channel, provider, label, sender_id, base_url, is_default, is_active) values
  ('sms', 'junubsms', 'JunubSMS (South Sudan)', 'SOUKJUNUB', 'https://api.junubsms.com/v1/send', true, false),
  ('sms', 'oracom', 'Oracom OraMobile', 'SOUKJUNUB', 'https://sms.oracom.ss/api/send', false, false),
  ('sms', 'easysendsms', 'EasySendSMS', 'SOUKJUNUB', 'https://api.easysendsms.app/bulksms/v1/send', false, false),
  ('sms', 'bulksms', 'BulkSMS.com', 'SOUKJUNUB', 'https://api.bulksms.com/v1/messages', false, false),
  ('sms', 'zigatext', 'Zigatext', 'SOUKJUNUB', 'https://api.zigatext.com/api/v1/sms/send', false, false),
  ('sms', 'africastalking', 'Africas Talking', 'SOUKJUNUB', 'https://api.africastalking.com/version1/messaging', false, false),
  ('whatsapp', 'whatsapp_cloud', 'WhatsApp Business Cloud API', null, 'https://graph.facebook.com/v20.0', true, false),
  ('email', 'smtp', 'SMTP email', null, null, true, false);