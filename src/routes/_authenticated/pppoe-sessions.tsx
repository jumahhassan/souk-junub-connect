/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlugZap, Power } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatUptime, relativeTime } from "@/lib/format";
import { disconnectPppoeSession, getPppoeSessions } from "@/lib/pppoe.functions";

export const Route = createFileRoute("/_authenticated/pppoe-sessions")({
  head: () => ({
    meta: [
      { title: "PPPoE active sessions | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Live PPPoE sessions with caller ID, profile, uptime, bytes in and out, current speed and one-click disconnect or reconnect.",
      },
      { property: "og:title", content: "PPPoE active sessions | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Real-time PPPoE session monitoring and control across every MikroTik router.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(getPppoeSessions);
  const control = useServerFn(disconnectPppoeSession);

  const { data } = useQuery({
    queryKey: ["pppoe-sessions"],
    queryFn: () => list(),
    refetchInterval: 10_000,
  });

  const active = ((data as any)?.active ?? []) as any[];
  const history = ((data as any)?.history ?? []) as any[];

  const act = useMutation({
    mutationFn: (vars: { sessionId: string; reconnect: boolean }) => control({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.reconnect ? "Reconnect queued" : "Disconnect queued");
      qc.invalidateQueries({ queryKey: ["pppoe-sessions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Command failed"),
  });

  const totalRx = active.reduce((a, s) => a + Number(s.rx_bytes ?? 0), 0);
  const totalTx = active.reduce((a, s) => a + Number(s.tx_bytes ?? 0), 0);

  return (
    <AppShell
      title="PPPoE sessions"
      description="Every connected fixed-line subscriber, live from the on-site agents."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Online now
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{active.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Session download
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{formatBytes(totalRx)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Session upload
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{formatBytes(totalTx)}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Caller ID</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Profile</th>
                <th className="px-4 py-2">IP address</th>
                <th className="px-4 py-2">Uptime</th>
                <th className="px-4 py-2">In / Out</th>
                <th className="px-4 py-2">Speed</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="px-4 py-2 font-mono text-xs">
                    {s.username}
                    <div className="text-muted-foreground">{s.routers?.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{s.caller_id ?? "—"}</td>
                  <td className="px-4 py-2">{s.service}</td>
                  <td className="px-4 py-2">{s.profile_name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.ip_address ?? "—"}</td>
                  <td className="px-4 py-2">{formatUptime(Number(s.uptime_seconds ?? 0))}</td>
                  <td className="px-4 py-2 text-xs">
                    {formatBytes(Number(s.rx_bytes ?? 0))} / {formatBytes(Number(s.tx_bytes ?? 0))}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {Number(s.rx_rate_kbps ?? 0)} / {Number(s.tx_rate_kbps ?? 0)} kbps
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act.mutate({ sessionId: s.id, reconnect: true })}
                      >
                        <PlugZap className="mr-1 h-3.5 w-3.5" />
                        Reconnect
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => act.mutate({ sessionId: s.id, reconnect: false })}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={9}>
                    No PPPoE sessions are currently connected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{s.username}</span>
              <span className="text-xs text-muted-foreground">
                {s.routers?.name ?? "—"} · {relativeTime(s.started_at)} ·{" "}
                {formatUptime(Number(s.uptime_seconds ?? 0))}
              </span>
              <span className="text-xs">
                {formatBytes(Number(s.rx_bytes ?? 0))} / {formatBytes(Number(s.tx_bytes ?? 0))}
              </span>
              <Badge variant="outline">{s.disconnect_reason ?? "closed"}</Badge>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">No closed sessions recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
