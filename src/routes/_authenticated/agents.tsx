import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgent, deleteAgent, getAgents } from "@/lib/network.functions";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "On-site Agents | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Register and monitor Souk Junub Agents — the on-site bridges that talk to MikroTik routers locally and report over HTTPS.",
      },
      { property: "og:title", content: "On-site Agents | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Agent enrolment tokens and heartbeat status for the SOUK JUNUB network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const qc = useQueryClient();
  const fetchAgents = useServerFn(getAgents);
  const create = useServerFn(createAgent);
  const remove = useServerFn(deleteAgent);

  const { data } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetchAgents(),
    refetchInterval: 15000,
  });
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => create({ data: { name: name.trim(), siteId: null } }),
    onSuccess: (res) => {
      setToken(res.token);
      setName("");
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (agentId: string) => remove({ data: { agentId } }),
    onSuccess: () => {
      toast.success("Agent revoked.");
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="On-site agents"
      description="Each agent polls its local routers and pushes telemetry outbound over HTTPS."
    >
      {token ? (
        <Card className="mb-4 border-primary/50">
          <CardContent className="p-5">
            <p className="text-sm font-medium">Enrolment token — shown once</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste it into the agent config on site. It cannot be retrieved again.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="flex-1 overflow-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
                {token}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(token);
                  toast.success("Token copied.");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToken(null)}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.agents ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No agents registered yet.
              </p>
            ) : (
              (data?.agents ?? []).map((a: any) => {
                const count = (data?.routers ?? []).filter((r: any) => r.agent_id === a.id).length;
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} router{count === 1 ? "" : "s"} · v{a.version ?? "—"} · token{" "}
                        <span className="font-mono">{a.token_prefix ?? "—"}…</span> · seen{" "}
                        {relativeTime(a.last_seen_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} pulse />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => drop.mutate(a.id)}
                        aria-label={`Revoke ${a.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Register an agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Agent name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juba NOC bridge"
                maxLength={80}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => add.mutate()}
              disabled={add.isPending || name.trim().length < 2}
            >
              {add.isPending ? "Creating…" : "Create agent token"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Install the agent on any always-on machine at the site — a small Linux box, a
              mini-PC, or a container on the office server.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
