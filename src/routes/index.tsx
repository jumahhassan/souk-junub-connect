import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Gauge, Radio, ShieldCheck, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOUK JUNUB — ISP & WiFi Billing for South Sudan" },
      {
        name: "description",
        content:
          "SOUK JUNUB manages MikroTik routers, hotspots and ISP billing across South Sudan, with live router health and every figure in SSP.",
      },
      { property: "og:title", content: "SOUK JUNUB — ISP & WiFi Management for South Sudan" },
      {
        property: "og:description",
        content:
          "Live MikroTik monitoring, one-click hotspot provisioning and SSP-based ISP billing built for Juba, Wau, Malakal, Bor and Rumbek.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Gauge,
    title: "Live router health",
    body: "Identity, RouterOS version, board, uptime, CPU, memory, latency and packet loss — refreshed every few seconds from the on-site agent.",
  },
  {
    icon: Wifi,
    title: "One-click hotspot provisioning",
    body: "Server profile, bandwidth-limited user profile, walled garden, DHCP pool, firewall, NAT and a restricted API user — with rollback if any step fails.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing exposed to the internet",
    body: "Routers stay behind NAT. The Souk Junub Agent dials out over HTTPS, so no management port is ever published.",
  },
  {
    icon: Activity,
    title: "Access points and backups",
    body: "Wireless registration sync, per-AP signal and CCQ, connected client counts, plus automatic configuration backups daily and on every change.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radio className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold tracking-widest">SOUK JUNUB</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Open console</Link>
        </Button>
      </header>

      <section className="grid-noise border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Juba · Wau · Malakal · Bor · Rumbek
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] md:text-6xl">
            ISP and WiFi operations for South Sudan, priced in SSP.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            SOUK JUNUB puts every MikroTik in your network — fibre, VSAT and tower — on one screen.
            Provision hotspots in one click, watch every access point, and keep automatic
            configuration backups without opening a single management port.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Sign in to the NOC</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Create the owner account</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        SOUK JUNUB — base currency SSP (South Sudanese Pound). Built for MTN, Zain and Digitel
        subscriber bases.
      </footer>
    </div>
  );
}
