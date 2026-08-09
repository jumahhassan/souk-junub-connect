import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acknowledgeAlert, getAlerts } from "@/lib/network.functions";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Open and acknowledged network alerts for SOUK JUNUB routers: offline devices, high load, packet loss and provisioning failures.",
      },
      { property: "og:title", content: "Alerts | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Network alerting for the SOUK JUNUB South Sudan ISP and WiFi network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const fetchAlerts = useServerFn(getAlerts);
  const ack = useServerFn(acknowledgeAlert);

  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(),
    refetchInterval: 15000,
  });

  const acknowledge = useMutation({
    mutationFn: (alertId: string) => ack({ data: { alertId } }),
    onSuccess: () => {
      toast.success("Alert acknowledged.");
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const routerName = (id: string | null) =>
    (data?.routers ?? []).find((r: any) => r.id === id)?.name ?? "Network";

  return (
    <AppShell title="Alerts" description="Everything that needs a technician's attention.">
      <Card>
        <CardContent className="space-y-2 p-5">
          {(data?.alerts ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No alerts. The network is quiet.
            </p>
          ) : (
            (data?.alerts ?? []).map((a: any) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.severity} />
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {routerName(a.router_id)} · {a.kind} · {relativeTime(a.created_at)}
                  </p>
                  {a.detail ? <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p> : null}
                </div>
                {a.acknowledged_at ? (
                  <span className="text-xs text-muted-foreground">
                    Acknowledged {relativeTime(a.acknowledged_at)}
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => acknowledge.mutate(a.id)}>
                    Acknowledge
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
