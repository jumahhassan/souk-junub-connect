import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRouters } from "@/lib/network.functions";
import { relativeTime, formatUptime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/routers/")({
  head: () => ({
    meta: [
      { title: "MikroTik Routers | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Every MikroTik router managed by SOUK JUNUB, with RouterOS version, uptime, load and hotspot user counts.",
      },
      { property: "og:title", content: "MikroTik Routers | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Router inventory and live health for the SOUK JUNUB South Sudan network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutersPage,
});

function RoutersPage() {
  const fetchRouters = useServerFn(getRouters);
  const { data, isLoading } = useQuery({
    queryKey: ["routers"],
    queryFn: () => fetchRouters(),
    refetchInterval: 15000,
  });

  const siteName = (id: string | null) =>
    data?.sites?.find((s: any) => s.id === id)?.name ?? "Unassigned";

  return (
    <AppShell
      title="Routers"
      description="MikroTik devices reporting through the Souk Junub Agent."
      actions={
        <Button asChild size="sm">
          <Link to="/routers/new">Add router</Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading routers…</p>
      ) : (data?.routers ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No routers yet. Register an agent on site, then run the provisioning wizard.
            </p>
            <Button asChild className="mt-4">
              <Link to="/routers/new">Start provisioning</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.routers ?? []).map((r: any) => (
            <Link key={r.id} to="/routers/$routerId" params={{ routerId: r.id }}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {r.host}:{r.api_port}
                      </p>
                    </div>
                    <StatusBadge status={r.status} pulse />
                  </div>

                  <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <Row label="Site" value={siteName(r.site_id)} />
                    <Row label="RouterOS" value={r.ros_version ?? "—"} />
                    <Row label="Board" value={r.board_name ?? "—"} />
                    <Row label="Uptime" value={formatUptime(r.uptime_seconds)} />
                    <Row label="CPU" value={`${Number(r.cpu_load ?? 0)}%`} />
                    <Row
                      label="Memory"
                      value={
                        r.memory_total_mb
                          ? `${r.memory_used_mb ?? 0} / ${r.memory_total_mb} MB`
                          : "—"
                      }
                    />
                    <Row label="Latency" value={r.latency_ms ? `${r.latency_ms} ms` : "—"} />
                    <Row label="Users" value={String(r.active_users ?? 0)} />
                  </dl>

                  <p className="text-[11px] text-muted-foreground">
                    Last heartbeat {relativeTime(r.last_seen_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right tabular-nums">{value}</dd>
    </>
  );
}
