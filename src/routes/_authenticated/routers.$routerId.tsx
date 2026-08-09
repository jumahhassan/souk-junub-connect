import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRouterDetail, sendRouterCommand } from "@/lib/network.functions";
import { formatBps, formatBytes, formatUptime, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/routers/$routerId")({
  head: () => ({
    meta: [
      { title: "Router Detail | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Interface throughput, access points, wireless clients, configuration backups and event history for a SOUK JUNUB MikroTik router.",
      },
      { property: "og:title", content: "Router Detail | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Deep-dive monitoring for a single MikroTik router on the SOUK JUNUB network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouterDetailPage,
});

function RouterDetailPage() {
  const { routerId } = Route.useParams();
  const fetchDetail = useServerFn(getRouterDetail);
  const runCommand = useServerFn(sendRouterCommand);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["router", routerId],
    queryFn: () => fetchDetail({ data: { routerId } }),
    refetchInterval: 10000,
  });

  const command = useMutation({
    mutationFn: (cmd: "backup_config" | "resync" | "reboot" | "fetch_config") =>
      runCommand({ data: { routerId, command: cmd } }),
    onSuccess: () => {
      toast.success("Command queued for the on-site agent.");
      void refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Router">
        <p className="text-sm text-muted-foreground">Loading router…</p>
      </AppShell>
    );
  }

  const r: any = data.router;
  const latest: any = data.metrics[data.metrics.length - 1] ?? null;

  return (
    <AppShell
      title={r.name}
      description={`${r.host}:${r.api_port} · ${data.site?.name ?? "Unassigned site"} · agent ${data.agent?.name ?? "none"}`}
      actions={
        <>
          <StatusBadge status={r.status} pulse />
          <Button size="sm" variant="outline" onClick={() => command.mutate("resync")}>
            Resync
          </Button>
          <Button size="sm" onClick={() => command.mutate("backup_config")}>
            Backup now
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="RouterOS" value={r.ros_version ?? "—"} hint={r.board_name ?? "Unknown board"} />
        <Metric label="Uptime" value={formatUptime(r.uptime_seconds)} hint={`Identity ${r.identity ?? "—"}`} />
        <Metric
          label="CPU / Memory"
          value={`${Number(r.cpu_load ?? 0)}%`}
          hint={
            r.memory_total_mb ? `${r.memory_used_mb ?? 0} of ${r.memory_total_mb} MB used` : "—"
          }
        />
        <Metric
          label="Latency"
          value={r.latency_ms ? `${r.latency_ms} ms` : "—"}
          hint={`${Number(r.packet_loss_pct ?? 0)}% packet loss · ${r.active_users ?? 0} users`}
        />
      </div>

      <Tabs defaultValue="interfaces" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
          <TabsTrigger value="aps">Access points</TabsTrigger>
          <TabsTrigger value="clients">Wireless clients</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="interfaces">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Interface throughput
                {latest ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    last sample {relativeTime(latest.recorded_at)}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.interfaces.length === 0 ? (
                <Empty>No interface data reported yet.</Empty>
              ) : (
                data.interfaces.map((i: any) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.role ?? "lan"} · {i.mac_address ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs tabular-nums">
                      <span className="text-success">↓ {formatBps(i.rx_bps)}</span>
                      <span className="text-info">↑ {formatBps(i.tx_bps)}</span>
                      <StatusBadge status={i.running ? "online" : "offline"} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aps">
          <Card>
            <CardContent className="space-y-2 p-5">
              {data.accessPoints.length === 0 ? (
                <Empty>No access points discovered on this router.</Empty>
              ) : (
                data.accessPoints.map((ap: any) => (
                  <div
                    key={ap.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{ap.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SSID {ap.ssid ?? "—"} · band {ap.band ?? "—"} · ch {ap.channel ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs tabular-nums">
                      <span>{ap.client_count ?? 0} clients</span>
                      <StatusBadge status={ap.status ?? "offline"} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardContent className="space-y-2 p-5">
              {data.apClients.length === 0 ? (
                <Empty>No wireless registrations right now.</Empty>
              ) : (
                data.apClients.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-2 text-sm"
                  >
                    <span className="font-mono text-xs">{c.mac_address}</span>
                    <div className="flex items-center gap-4 text-xs tabular-nums text-muted-foreground">
                      <span>{c.ip_address ?? "—"}</span>
                      <span>{c.signal_dbm ?? "—"} dBm</span>
                      <span>CCQ {c.ccq ?? "—"}%</span>
                      <span>{formatUptime(c.uptime_seconds)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups">
          <Card>
            <CardContent className="space-y-2 p-5">
              {data.backups.length === 0 ? (
                <Empty>No configuration backups stored yet.</Empty>
              ) : (
                data.backups.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-2 text-sm"
                  >
                    <span className="font-mono text-xs">{b.file_name}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{b.reason}</span>
                      <span>{formatBytes(b.size_bytes)}</span>
                      <span>{relativeTime(b.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="space-y-2 p-5">
              {data.events.length === 0 ? (
                <Empty>No events yet.</Empty>
              ) : (
                data.events.map((e: any) => (
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
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
