
-- resellers
create table public.resellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  parent_id uuid references public.resellers(id) on delete set null,
  code text not null unique,
  full_name text not null,
  phone text,
  email text,
  area text,
  tier text not null default 'retailer' check (tier in ('master','sub','retailer')),
  commission_type text not null default 'percent' check (commission_type in ('percent','fixed')),
  commission_rate numeric not null default 10,
  balance_ssp numeric not null default 0,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resellers_parent_idx on public.resellers(parent_id);
create index resellers_user_idx on public.resellers(user_id);

alter table public.vouchers add column if not exists reseller_id uuid references public.resellers(id) on delete set null;
create index if not exists vouchers_reseller_idx on public.vouchers(reseller_id);

create table public.reseller_allocations (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  batch_id uuid references public.voucher_batches(id) on delete set null,
  package_id uuid references public.hotspot_packages(id) on delete set null,
  quantity integer not null default 0,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index reseller_allocations_reseller_idx on public.reseller_allocations(reseller_id);

create table public.reseller_sales (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  voucher_id uuid references public.vouchers(id) on delete set null,
  package_id uuid references public.hotspot_packages(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  customer_phone text,
  price_ssp numeric not null default 0,
  commission_ssp numeric not null default 0,
  settled boolean not null default false,
  payout_id uuid,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index reseller_sales_reseller_idx on public.reseller_sales(reseller_id);
create index reseller_sales_sold_idx on public.reseller_sales(sold_at desc);

create table public.reseller_commission_rules (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  package_id uuid references public.hotspot_packages(id) on delete cascade,
  commission_type text not null default 'percent' check (commission_type in ('percent','fixed')),
  commission_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (reseller_id, package_id)
);

create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  amount_ssp numeric not null,
  method text not null default 'mtn_momo',
  destination text,
  status text not null default 'requested' check (status in ('requested','approved','paid','rejected')),
  reference text,
  note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commission_payouts_reseller_idx on public.commission_payouts(reseller_id);

alter table public.reseller_sales
  add constraint reseller_sales_payout_fk foreign key (payout_id) references public.commission_payouts(id) on delete set null;

create table public.payment_gateways (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  label text not null,
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  currency text not null default 'SSP',
  phone_prefix text,
  callback_url text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- grants
grant select, insert, update, delete on public.resellers to authenticated;
grant select, insert, update, delete on public.reseller_allocations to authenticated;
grant select, insert, update, delete on public.reseller_sales to authenticated;
grant select, insert, update, delete on public.reseller_commission_rules to authenticated;
grant select, insert, update, delete on public.commission_payouts to authenticated;
grant select, insert, update, delete on public.payment_gateways to authenticated;
grant all on public.resellers to service_role;
grant all on public.reseller_allocations to service_role;
grant all on public.reseller_sales to service_role;
grant all on public.reseller_commission_rules to service_role;
grant all on public.commission_payouts to service_role;
grant all on public.payment_gateways to service_role;

alter table public.resellers enable row level security;
alter table public.reseller_allocations enable row level security;
alter table public.reseller_sales enable row level security;
alter table public.reseller_commission_rules enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.payment_gateways enable row level security;

-- resellers
create policy "staff read resellers" on public.resellers for select to authenticated
  using (public.is_staff_writer(auth.uid()) or user_id = auth.uid());
create policy "staff write resellers" on public.resellers for insert to authenticated
  with check (public.is_staff_writer(auth.uid()));
create policy "staff update resellers" on public.resellers for update to authenticated
  using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admin delete resellers" on public.resellers for delete to authenticated
  using (public.is_admin(auth.uid()));

-- allocations
create policy "read allocations" on public.reseller_allocations for select to authenticated
  using (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "staff insert allocations" on public.reseller_allocations for insert to authenticated
  with check (public.is_staff_writer(auth.uid()));
create policy "staff update allocations" on public.reseller_allocations for update to authenticated
  using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admin delete allocations" on public.reseller_allocations for delete to authenticated
  using (public.is_admin(auth.uid()));

-- sales
create policy "read sales" on public.reseller_sales for select to authenticated
  using (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "insert sales" on public.reseller_sales for insert to authenticated
  with check (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "staff update sales" on public.reseller_sales for update to authenticated
  using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));

-- commission rules
create policy "read commission rules" on public.reseller_commission_rules for select to authenticated
  using (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "staff manage commission rules" on public.reseller_commission_rules for all to authenticated
  using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));

-- payouts
create policy "read payouts" on public.commission_payouts for select to authenticated
  using (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "request payouts" on public.commission_payouts for insert to authenticated
  with check (public.is_staff_writer(auth.uid()) or exists (select 1 from public.resellers r where r.id = reseller_id and r.user_id = auth.uid()));
create policy "staff decide payouts" on public.commission_payouts for update to authenticated
  using (public.is_staff_writer(auth.uid())) with check (public.is_staff_writer(auth.uid()));
create policy "admin delete payouts" on public.commission_payouts for delete to authenticated
  using (public.is_admin(auth.uid()));

-- gateways (staff only)
create policy "staff read gateways" on public.payment_gateways for select to authenticated
  using (public.is_staff_writer(auth.uid()));
create policy "staff manage gateways" on public.payment_gateways for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create trigger resellers_touch before update on public.resellers for each row execute function public.touch_updated_at();
create trigger payouts_touch before update on public.commission_payouts for each row execute function public.touch_updated_at();
create trigger gateways_touch before update on public.payment_gateways for each row execute function public.touch_updated_at();

insert into public.payment_gateways (provider, label, phone_prefix, config, is_active, is_default) values
  ('mtn_momo','MTN MoMo South Sudan','+21192','{"api_user":"","subscription_key":"","target_environment":"sandbox"}',false,true),
  ('zain_cash','Zain Cash South Sudan','+21199','{"merchant_id":"","api_key":""}',false,false),
  ('nips','NIPS — Bank of South Sudan',null,'{"institution_code":"","api_key":""}',false,false),
  ('tola','Tola Mobile',null,'{"merchant_id":"","api_key":""}',false,false),
  ('flutterwave','Flutterwave',null,'{"public_key":"","secret_key":""}',false,false),
  ('paystack','Paystack',null,'{"public_key":"","secret_key":""}',false,false),
  ('bank_transfer','Bank transfer / manual',null,'{"bank_name":"","account_number":""}',true,false);
