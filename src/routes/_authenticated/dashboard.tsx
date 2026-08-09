import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Cpu, Router as RouterIcon, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverview } from "@/lib/network.functions";
import { formatBps, relativeTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Network Dashboard | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Live view of every MikroTik router, agent and access point on the SOUK JUNUB network across South Sudan.",
      },
      { property: "og:title", content: "Network Dashboard | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Router health, throughput and open alerts for the SOUK JUNUB network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchOverview = useServerFn(getOverview);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "routers" }, () => {
        void refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        void refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  const routers = data?.routers ?? [];
  const online = routers.filter((r: any) => r.status === "online").length;
  const activeUsers = routers.reduce((sum: number, r: any) => sum + (r.active_users ?? 0), 0);
  const avgCpu = routers.length
    ? Math.round(
        routers.reduce((sum: number, r: any) => sum + Number(r.cpu_load ?? 0), 0) / routers.length,
      )
    : 0;

  return (
    <AppShell
      title="Network dashboard"
      description="Live MikroTik health across every SOUK JUNUB site. All billing figures in SSP."
      actions={
        <Button asChild size="sm">
          <Link to="/routers/new">Add router</Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading network state…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={RouterIcon}
              label="Routers online"
              value={`${online} / ${routers.length}`}
              hint={`${data?.agents?.length ?? 0} agents registered`}
            />
            <Stat
              icon={Users}
              label="Active hotspot users"
              value={String(activeUsers)}
              hint="Across all hotspot servers"
            />
            <Stat
              icon={Cpu}
              label="Average CPU load"
              value={`${avgCpu}%`}
              hint={`${data?.sites?.length ?? 0} sites`}
            />
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  WAN throughput
                </p>
                <div className="mt-3 space-y-1">
                  <p className="flex items-center gap-2 text-lg font-semibold tabular-nums">
                    <ArrowDown className="h-4 w-4 text-success" />
                    {formatBps(data?.throughput?.rx ?? 0)}
                  </p>
                  <p className="flex items-center gap-2 text-lg font-semibold tabular-nums">
                    <ArrowUp className="h-4 w-4 text-info" />
                    {formatBps(data?.throughput?.tx ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Routers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {routers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No routers yet. Register an agent, then add your first MikroTik.
                  </p>
                ) : (
                  routers.map((r: any) => (
                    <Link
                      key={r.id}
                      to="/routers/$routerId"
                      params={{ routerId: r.id }}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:border-primary/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Seen {relativeTime(r.last_seen_at)} · {r.active_users ?? 0} users
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                        <span>CPU {Number(r.cpu_load ?? 0)}%</span>
                        <span>{r.latency_ms ?? "—"} ms</span>
                        <StatusBadge status={r.status} pulse />
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Open alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.alerts ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
                ) : (
                  (data?.alerts ?? []).map((a: any) => (
                    <div key={a.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        <StatusBadge status={a.severity} />
                      </div>
                      {a.detail ? (
                        <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {relativeTime(a.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent router events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.events ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                (data?.events ?? []).map((e: any) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0"
                  >
                    <span className="text-muted-foreground">
                      <span className="font-mono text-xs uppercase text-primary">{e.kind}</span>{" "}
                      {e.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(e.created_at)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
