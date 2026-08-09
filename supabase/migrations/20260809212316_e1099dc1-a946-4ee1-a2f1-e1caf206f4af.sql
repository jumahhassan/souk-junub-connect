-- PPPoE plans
CREATE TABLE public.pppoe_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  profile_name text NOT NULL,
  download_kbps integer NOT NULL DEFAULT 5120,
  upload_kbps integer NOT NULL DEFAULT 2048,
  burst_download_kbps integer,
  burst_upload_kbps integer,
  burst_threshold_download_kbps integer,
  burst_threshold_upload_kbps integer,
  burst_time_seconds integer,
  local_address text,
  remote_address_pool text,
  dns_servers text,
  change_tcp_mss boolean NOT NULL DEFAULT true,
  use_compression boolean NOT NULL DEFAULT false,
  use_encryption boolean NOT NULL DEFAULT false,
  only_one boolean NOT NULL DEFAULT true,
  billing_type text NOT NULL DEFAULT 'prepaid',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  price_ssp numeric NOT NULL DEFAULT 0,
  fup_enabled boolean NOT NULL DEFAULT false,
  fup_after_gb numeric,
  fup_download_kbps integer,
  fup_upload_kbps integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_plans TO authenticated;
GRANT ALL ON public.pppoe_plans TO service_role;
GRANT SELECT ON public.pppoe_plans TO anon;
ALTER TABLE public.pppoe_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pppoe_plans_read_auth" ON public.pppoe_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "pppoe_plans_read_anon" ON public.pppoe_plans FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "pppoe_plans_insert" ON public.pppoe_plans FOR INSERT TO authenticated WITH CHECK (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_plans_update" ON public.pppoe_plans FOR UPDATE TO authenticated USING (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_plans_delete" ON public.pppoe_plans FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER pppoe_plans_touch BEFORE UPDATE ON public.pppoe_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PPPoE subscribers
CREATE TABLE public.pppoe_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  service text NOT NULL DEFAULT 'pppoe',
  plan_id uuid REFERENCES public.pppoe_plans(id),
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  full_name text,
  phone text,
  email text,
  address text,
  caller_id text,
  remote_address text,
  local_address text,
  comment text,
  status text NOT NULL DEFAULT 'active',
  is_online boolean NOT NULL DEFAULT false,
  auto_renew boolean NOT NULL DEFAULT false,
  balance_ssp numeric NOT NULL DEFAULT 0,
  activated_at timestamptz,
  expires_at timestamptz,
  last_seen_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_subscribers TO authenticated;
GRANT ALL ON public.pppoe_subscribers TO service_role;
ALTER TABLE public.pppoe_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pppoe_subs_read" ON public.pppoe_subscribers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pppoe_subs_insert" ON public.pppoe_subscribers FOR INSERT TO authenticated WITH CHECK (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_subs_update" ON public.pppoe_subscribers FOR UPDATE TO authenticated USING (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_subs_delete" ON public.pppoe_subscribers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER pppoe_subs_touch BEFORE UPDATE ON public.pppoe_subscribers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX pppoe_subs_router_idx ON public.pppoe_subscribers(router_id);
CREATE INDEX pppoe_subs_status_idx ON public.pppoe_subscribers(status);

-- PPPoE sessions
CREATE TABLE public.pppoe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.pppoe_subscribers(id) ON DELETE CASCADE,
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  username text NOT NULL,
  caller_id text,
  service text NOT NULL DEFAULT 'pppoe',
  profile_name text,
  ip_address text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  uptime_seconds bigint NOT NULL DEFAULT 0,
  rx_bytes bigint NOT NULL DEFAULT 0,
  tx_bytes bigint NOT NULL DEFAULT 0,
  rx_rate_kbps integer NOT NULL DEFAULT 0,
  tx_rate_kbps integer NOT NULL DEFAULT 0,
  disconnect_reason text,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE ON public.pppoe_sessions TO authenticated;
GRANT ALL ON public.pppoe_sessions TO service_role;
ALTER TABLE public.pppoe_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pppoe_sessions_read" ON public.pppoe_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "pppoe_sessions_insert" ON public.pppoe_sessions FOR INSERT TO authenticated WITH CHECK (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_sessions_update" ON public.pppoe_sessions FOR UPDATE TO authenticated USING (public.is_staff_writer(auth.uid()));
CREATE INDEX pppoe_sessions_sub_idx ON public.pppoe_sessions(subscriber_id, started_at DESC);

-- Static IP allocations
CREATE TABLE public.static_ip_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  subscriber_id uuid REFERENCES public.pppoe_subscribers(id) ON DELETE SET NULL,
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  mac_address text,
  label text,
  monthly_fee_ssp numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (router_id, ip_address)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.static_ip_allocations TO authenticated;
GRANT ALL ON public.static_ip_allocations TO service_role;
ALTER TABLE public.static_ip_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "static_ips_read" ON public.static_ip_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "static_ips_insert" ON public.static_ip_allocations FOR INSERT TO authenticated WITH CHECK (public.is_staff_writer(auth.uid()));
CREATE POLICY "static_ips_update" ON public.static_ip_allocations FOR UPDATE TO authenticated USING (public.is_staff_writer(auth.uid()));
CREATE POLICY "static_ips_delete" ON public.static_ip_allocations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER static_ips_touch BEFORE UPDATE ON public.static_ip_allocations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PPPoE invoices
CREATE TABLE public.pppoe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  subscriber_id uuid NOT NULL REFERENCES public.pppoe_subscribers(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.pppoe_plans(id),
  amount_ssp numeric NOT NULL DEFAULT 0,
  static_ip_fee_ssp numeric NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_invoices TO authenticated;
GRANT ALL ON public.pppoe_invoices TO service_role;
ALTER TABLE public.pppoe_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pppoe_inv_read" ON public.pppoe_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "pppoe_inv_insert" ON public.pppoe_invoices FOR INSERT TO authenticated WITH CHECK (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_inv_update" ON public.pppoe_invoices FOR UPDATE TO authenticated USING (public.is_staff_writer(auth.uid()));
CREATE POLICY "pppoe_inv_delete" ON public.pppoe_invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER pppoe_inv_touch BEFORE UPDATE ON public.pppoe_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- link payments to pppoe
ALTER TABLE public.payments
  ADD COLUMN pppoe_subscriber_id uuid REFERENCES public.pppoe_subscribers(id) ON DELETE SET NULL,
  ADD COLUMN pppoe_invoice_id uuid REFERENCES public.pppoe_invoices(id) ON DELETE SET NULL;

-- seed plans
INSERT INTO public.pppoe_plans (name, description, profile_name, download_kbps, upload_kbps, burst_download_kbps, burst_upload_kbps, burst_threshold_download_kbps, burst_threshold_upload_kbps, burst_time_seconds, remote_address_pool, dns_servers, billing_type, billing_cycle, price_ssp, sort_order) VALUES
('Home Basic 5M', 'Entry level home fibre/wireless', 'sj-home-5m', 5120, 2048, 7168, 3072, 4096, 1536, 16, 'sj-pppoe-pool', '8.8.8.8,1.1.1.1', 'prepaid', 'monthly', 45000, 1),
('Home Plus 10M', 'Family streaming plan', 'sj-home-10m', 10240, 5120, 15360, 7168, 8192, 4096, 16, 'sj-pppoe-pool', '8.8.8.8,1.1.1.1', 'prepaid', 'monthly', 80000, 2),
('Business 20M', 'SME dedicated bandwidth', 'sj-biz-20m', 20480, 10240, 30720, 15360, 16384, 8192, 16, 'sj-pppoe-biz', '8.8.8.8,1.1.1.1', 'postpaid', 'monthly', 250000, 3),
('Business 50M', 'Corporate / NGO leased plan', 'sj-biz-50m', 51200, 25600, NULL, NULL, NULL, NULL, NULL, 'sj-pppoe-biz', '8.8.8.8,1.1.1.1', 'postpaid', 'monthly', 600000, 4),
('Weekly Home 5M', 'Short-cycle prepaid plan', 'sj-home-5m', 5120, 2048, NULL, NULL, NULL, NULL, NULL, 'sj-pppoe-pool', '8.8.8.8,1.1.1.1', 'prepaid', 'weekly', 14000, 5),
('Daily Home 5M', 'Pay-as-you-go daily', 'sj-home-5m', 5120, 2048, NULL, NULL, NULL, NULL, NULL, 'sj-pppoe-pool', '8.8.8.8,1.1.1.1', 'prepaid', 'daily', 2500, 6);