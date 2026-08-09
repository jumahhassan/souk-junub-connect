import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgents, getProvisioningJob, provisionRouter } from "@/lib/network.functions";
import {
  DEFAULT_WALLED_GARDEN,
  PROVISIONING_STEPS,
  buildProvisioningScript,
} from "@/lib/mikrotik-script";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/routers/new")({
  head: () => ({
    meta: [
      { title: "Provision a MikroTik Router | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Four-step wizard that provisions a MikroTik hotspot: server profile, DHCP pool, walled garden, firewall, NAT and a restricted API user.",
      },
      { property: "og:title", content: "Provision a MikroTik Router | SOUK JUNUB" },
      {
        property: "og:description",
        content: "One-click hotspot provisioning with automatic rollback for SOUK JUNUB sites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewRouterPage,
});

const STEP_TITLES = ["Connection", "Hotspot", "Review", "Provisioning"];

function NewRouterPage() {
  const navigate = useNavigate();
  const fetchAgents = useServerFn(getAgents);
  const runProvision = useServerFn(provisionRouter);
  const fetchJob = useServerFn(getProvisioningJob);

  const { data: agentData } = useQuery({ queryKey: ["agents"], queryFn: () => fetchAgents() });

  const [step, setStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [routerId, setRouterId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    host: "",
    apiPort: 8728,
    useSsl: false,
    siteId: "",
    agentId: "",
    heartbeatThresholdSeconds: 120,
    adminUsername: "admin",
    adminPassword: "",
    hotspotInterface: "bridge-hotspot",
    hotspotNetwork: "10.51.0.0/24",
    gatewayAddress: "10.51.0.1",
    poolStart: "10.51.0.10",
    poolEnd: "10.51.0.254",
    dnsServers: "8.8.8.8,1.1.1.1",
    wanInterface: "ether1",
    rateLimit: "4M/4M",
    sessionTimeout: "1d",
    walledGarden: DEFAULT_WALLED_GARDEN.join("\n"),
    apiUsername: "souk-junub-api",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const config = {
    routerName: form.name || "souk-junub",
    hotspotInterface: form.hotspotInterface,
    hotspotNetwork: form.hotspotNetwork,
    gatewayAddress: form.gatewayAddress,
    poolStart: form.poolStart,
    poolEnd: form.poolEnd,
    dnsServers: form.dnsServers,
    wanInterface: form.wanInterface,
    rateLimit: form.rateLimit,
    sessionTimeout: form.sessionTimeout,
    walledGarden: form.walledGarden
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    apiUsername: form.apiUsername,
  };

  const mutation = useMutation({
    mutationFn: () =>
      runProvision({
        data: {
          name: form.name.trim(),
          host: form.host.trim(),
          apiPort: Number(form.apiPort),
          useSsl: form.useSsl,
          siteId: null,
          agentId: form.agentId,
          heartbeatThresholdSeconds: Number(form.heartbeatThresholdSeconds),
          adminUsername: form.adminUsername.trim(),
          adminPassword: form.adminPassword,
          config,
        },
      }),
    onSuccess: (res) => {
      setJobId(res.jobId);
      setRouterId(res.routerId);
      setStep(3);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: job } = useQuery({
    queryKey: ["provisioning-job", jobId],
    queryFn: () => fetchJob({ data: { jobId: jobId as string } }),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.job?.status;
      return status === "succeeded" || status === "failed" ? false : 2500;
    },
  });

  function next() {
    if (step === 0) {
      if (!form.name.trim() || !form.host.trim() || !form.agentId || !form.adminPassword) {
        toast.error("Router name, host, agent and admin password are required.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  }

  return (
    <AppShell
      title="Provision a router"
      description="The on-site agent runs every command locally — nothing is exposed to the internet."
    >
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEP_TITLES.map((t, i) => (
          <li
            key={t}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              i === step
                ? "border-primary bg-primary/10 text-primary"
                : i < step
                  ? "border-success/40 text-success"
                  : "border-border text-muted-foreground",
            )}
          >
            {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
            {t}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Router connection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Router name">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Juba Konyokonyo Tower"
                maxLength={80}
              />
            </Field>
            <Field label="LAN host / IP">
              <Input
                value={form.host}
                onChange={(e) => set({ host: e.target.value })}
                placeholder="192.168.88.1"
                maxLength={120}
              />
            </Field>
            <Field label="API port">
              <Input
                type="number"
                value={form.apiPort}
                onChange={(e) => set({ apiPort: Number(e.target.value) })}
              />
            </Field>
            <Field label="On-site agent">
              <Select value={form.agentId} onValueChange={(v) => set({ agentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {(agentData?.agents ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Admin username">
              <Input
                value={form.adminUsername}
                onChange={(e) => set({ adminUsername: e.target.value })}
                maxLength={60}
              />
            </Field>
            <Field label="Admin password">
              <Input
                type="password"
                value={form.adminPassword}
                onChange={(e) => set({ adminPassword: e.target.value })}
                autoComplete="off"
              />
            </Field>
            <Field label="Offline threshold (seconds)">
              <Input
                type="number"
                value={form.heartbeatThresholdSeconds}
                onChange={(e) => set({ heartbeatThresholdSeconds: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.useSsl} onCheckedChange={(v) => set({ useSsl: v })} />
              <span className="text-sm">Use API-SSL (port 8729)</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hotspot configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Hotspot interface / bridge">
              <Input
                value={form.hotspotInterface}
                onChange={(e) => set({ hotspotInterface: e.target.value })}
              />
            </Field>
            <Field label="WAN interface">
              <Input
                value={form.wanInterface}
                onChange={(e) => set({ wanInterface: e.target.value })}
              />
            </Field>
            <Field label="Hotspot network (CIDR)">
              <Input
                value={form.hotspotNetwork}
                onChange={(e) => set({ hotspotNetwork: e.target.value })}
              />
            </Field>
            <Field label="Gateway address">
              <Input
                value={form.gatewayAddress}
                onChange={(e) => set({ gatewayAddress: e.target.value })}
              />
            </Field>
            <Field label="Pool start">
              <Input value={form.poolStart} onChange={(e) => set({ poolStart: e.target.value })} />
            </Field>
            <Field label="Pool end">
              <Input value={form.poolEnd} onChange={(e) => set({ poolEnd: e.target.value })} />
            </Field>
            <Field label="DNS servers">
              <Input
                value={form.dnsServers}
                onChange={(e) => set({ dnsServers: e.target.value })}
              />
            </Field>
            <Field label="Default rate limit (rx/tx)">
              <Input value={form.rateLimit} onChange={(e) => set({ rateLimit: e.target.value })} />
            </Field>
            <Field label="Session timeout">
              <Input
                value={form.sessionTimeout}
                onChange={(e) => set({ sessionTimeout: e.target.value })}
              />
            </Field>
            <Field label="Restricted API username">
              <Input
                value={form.apiUsername}
                onChange={(e) => set({ apiUsername: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Walled garden (one host per line)">
                <Textarea
                  rows={5}
                  value={form.walledGarden}
                  onChange={(e) => set({ walledGarden: e.target.value })}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review the generated RouterOS script</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              The agent executes these commands over the local API. A pre-change backup is taken
              first and the whole batch is rolled back automatically if any step fails.
            </p>
            <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
              {buildProvisioningScript(config)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provisioning progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PROVISIONING_STEPS.map((s) => {
              const row = (job?.steps ?? []).find((x: any) => x.step_key === s.key);
              const status = row?.status ?? "pending";
              return (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {status === "running" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-info" />
                    ) : status === "succeeded" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    )}
                    {s.label}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {String(status).replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
            {job?.job?.error ? (
              <p className="text-sm text-destructive">{job.job.error}</p>
            ) : null}
            {routerId ? (
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/routers/$routerId", params: { routerId } })}
              >
                Open router
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step < 3 ? (
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step === 2 ? (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Queueing…" : "Provision router"}
            </Button>
          ) : (
            <Button onClick={next}>Continue</Button>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
