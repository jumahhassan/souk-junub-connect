/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowRightLeft, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatSSP, relativeTime } from "@/lib/format";
import {
  deleteSubscriber,
  getSubscribers,
  importSubscribers,
  renewSubscriber,
  saveSubscriber,
  setSubscriberStatus,
  transferSubscribers,
} from "@/lib/pppoe.functions";

const EMPTY = {
  id: undefined as string | undefined,
  username: "",
  password: "",
  service: "pppoe",
  plan_id: "",
  router_id: "",
  site_id: "",
  full_name: "",
  phone: "",
  email: "",
  address: "",
  caller_id: "",
  remote_address: "",
  local_address: "",
  comment: "",
  status: "active" as "active" | "disabled" | "expired",
  auto_renew: false,
  expires_at: "",
};

const SAMPLE_CSV =
  "username,password,full_name,phone,caller_id,remote_address,plan,comment\njohn.juba,Secret123,John Deng,0921234567,AA:BB:CC:DD:EE:FF,10.60.0.25,Home Basic 5M,Munuki block 3";

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      const v = (cells[i] ?? "").trim();
      if (v) row[h] = v;
    });
    return row;
  });
}

function statusTone(status: string, expiresAt: string | null) {
  if (status === "disabled") return "destructive" as const;
  if (status === "expired") return "destructive" as const;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "destructive" as const;
  return "secondary" as const;
}

export const Route = createFileRoute("/_authenticated/pppoe-subscribers")({
  head: () => ({
    meta: [
      { title: "PPPoE subscribers | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Manage PPPoE secrets, caller IDs, static addresses and subscription expiry, with CSV import and bulk transfer between MikroTik routers.",
      },
      { property: "og:title", content: "PPPoE subscribers | SOUK JUNUB" },
      {
        property: "og:description",
        content: "PPPoE secret management, CSV import and bulk router migration in SSP billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscribersPage,
});

function SubscribersPage() {
  const qc = useQueryClient();
  const list = useServerFn(getSubscribers);
  const persist = useServerFn(saveSubscriber);
  const remove = useServerFn(deleteSubscriber);
  const doImport = useServerFn(importSubscribers);
  const doTransfer = useServerFn(transferSubscribers);
  const doStatus = useServerFn(setSubscriberStatus);
  const doRenew = useServerFn(renewSubscriber);

  const { data } = useQuery({ queryKey: ["pppoe-subscribers"], queryFn: () => list() });
  const subscribers = ((data as any)?.subscribers ?? []) as any[];
  const plans = ((data as any)?.plans ?? []) as any[];
  const routers = ((data as any)?.routers ?? []) as any[];
  const sites = ((data as any)?.sites ?? []) as any[];

  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [importRouter, setImportRouter] = useState("");
  const [importSite, setImportSite] = useState("");
  const [targetRouter, setTargetRouter] = useState("");
  const [planMap, setPlanMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["pppoe-subscribers"] });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) =>
      [s.username, s.full_name, s.phone, s.caller_id, s.remote_address]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q)),
    );
  }, [subscribers, query]);

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(form.id ? { id: form.id } : {}),
          username: form.username.trim(),
          password: form.password.trim(),
          service: form.service.trim() || "pppoe",
          plan_id: form.plan_id || null,
          router_id: form.router_id || null,
          site_id: form.site_id || null,
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          caller_id: form.caller_id.trim() || null,
          remote_address: form.remote_address.trim() || null,
          local_address: form.local_address.trim() || null,
          comment: form.comment.trim() || null,
          status: form.status,
          auto_renew: form.auto_renew,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Subscriber saved");
      setOpen(false);
      setForm(EMPTY);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save subscriber"),
  });

  const del = useMutation({
    mutationFn: (subscriberId: string) => remove({ data: { subscriberId } }),
    onSuccess: () => {
      toast.success("Subscriber removed");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove subscriber"),
  });

  const bulkStatus = useMutation({
    mutationFn: (status: "active" | "disabled" | "expired") =>
      doStatus({ data: { subscriberIds: selected, status } }),
    onSuccess: () => {
      toast.success("Status updated");
      setSelected([]);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update status"),
  });

  const renew = useMutation({
    mutationFn: (subscriberId: string) =>
      doRenew({ data: { subscriberId, cycles: 1, provider: "cash" as const } }),
    onSuccess: () => {
      toast.success("Subscription renewed for one cycle");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not renew"),
  });

  const runImport = useMutation({
    mutationFn: () => {
      const rows = parseCsv(csv);
      if (!rows.length) throw new Error("No rows found. Include a header row.");
      return doImport({
        data: {
          rows: rows as any,
          routerId: importRouter || null,
          siteId: importSite || null,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Imported ${res.inserted} subscriber(s)`);
      if (res.failed?.length) toast.error(`${res.failed.length} row(s) failed`);
      setCsv("");
      setImportOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const runTransfer = useMutation({
    mutationFn: () =>
      doTransfer({
        data: {
          subscriberIds: selected,
          targetRouterId: targetRouter,
          planMap: Object.entries(planMap)
            .filter(([, to]) => Boolean(to))
            .map(([fromPlanId, toPlanId]) => ({ fromPlanId, toPlanId })),
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Moved ${res.moved} subscriber(s)`);
      setSelected([]);
      setTransferOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Transfer failed"),
  });

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <AppShell
      title="PPPoE subscribers"
      description="Secrets, profiles, caller IDs and subscription state for fixed-line customers."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen((v) => !v)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => setTransferOpen((v) => !v)}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer ({selected.length})
          </Button>
          <Button
            onClick={() => {
              setForm(EMPTY);
              setOpen((v) => !v);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New subscriber
          </Button>
        </div>
      }
    >
      {open && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{form.id ? "Edit subscriber" : "Add PPPoE secret"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Username (secret name)</Label>
              <Input value={form.username} onChange={(e) => set({ username: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input value={form.password} onChange={(e) => set({ password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Input value={form.service} onChange={(e) => set({ service: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan / profile</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.plan_id}
                onChange={(e) => set({ plan_id: e.target.value })}
              >
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatSSP(Number(p.price_ssp))}/{p.billing_cycle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Router</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.router_id}
                onChange={(e) => set({ router_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.site_id}
                onChange={(e) => set({ site_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Caller ID (MAC)</Label>
              <Input value={form.caller_id} onChange={(e) => set({ caller_id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Remote IP</Label>
              <Input
                value={form.remote_address}
                onChange={(e) => set({ remote_address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Local IP</Label>
              <Input
                value={form.local_address}
                onChange={(e) => set({ local_address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => set({ status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Expires at</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => set({ expires_at: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Auto-renew</span>
              <Switch checked={form.auto_renew} onCheckedChange={(v) => set({ auto_renew: v })} />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label>Comment</Label>
              <Textarea
                rows={2}
                value={form.comment}
                onChange={(e) => set({ comment: e.target.value })}
              />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.username.trim() || !form.password.trim()}
              >
                {save.isPending ? "Saving…" : "Save subscriber"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {importOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bulk import from CSV / Excel export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Paste rows with a header line. Plan is matched by plan name. Columns:
              username, password, full_name, phone, caller_id, remote_address, plan, comment.
            </p>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              placeholder={SAMPLE_CSV}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Assign to router</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={importRouter}
                  onChange={(e) => setImportRouter(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {routers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to site</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={importSite}
                  onChange={(e) => setImportSite(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => runImport.mutate()} disabled={runImport.isPending}>
                {runImport.isPending ? "Importing…" : "Import subscribers"}
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {transferOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bulk transfer {selected.length} subscriber(s)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Target router</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={targetRouter}
                onChange={(e) => setTargetRouter(e.target.value)}
              >
                <option value="">Select router…</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Plan mapping (optional)</Label>
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-48 shrink-0 text-sm text-muted-foreground">{p.name} →</span>
                  <select
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    value={planMap[p.id] ?? ""}
                    onChange={(e) => setPlanMap((m) => ({ ...m, [p.id]: e.target.value }))}
                  >
                    <option value="">Keep current plan</option>
                    {plans.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => runTransfer.mutate()}
                disabled={runTransfer.isPending || !targetRouter}
              >
                {runTransfer.isPending ? "Moving…" : "Transfer subscribers"}
              </Button>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{filtered.length} subscriber(s)</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-56"
              placeholder="Search username, phone, MAC…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!selected.length}
              onClick={() => bulkStatus.mutate("active")}
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!selected.length}
              onClick={() => bulkStatus.mutate("disabled")}
            >
              Disable
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2" />
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Router</th>
                <th className="px-4 py-2">Caller ID / IP</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selected.includes(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {s.username}
                    {s.is_online && <span className="ml-2 text-primary">● online</span>}
                  </td>
                  <td className="px-4 py-2">
                    {s.full_name ?? "—"}
                    <div className="text-xs text-muted-foreground">{s.phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-2">{s.pppoe_plans?.name ?? "—"}</td>
                  <td className="px-4 py-2">{s.routers?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {s.caller_id ?? "—"}
                    <div className="text-muted-foreground">{s.remote_address ?? ""}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                    <div className="text-muted-foreground">{relativeTime(s.last_seen_at)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={statusTone(s.status, s.expires_at)}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Renew one cycle"
                        onClick={() => renew.mutate(s.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            ...EMPTY,
                            ...s,
                            plan_id: s.plan_id ?? "",
                            router_id: s.router_id ?? "",
                            site_id: s.site_id ?? "",
                            full_name: s.full_name ?? "",
                            phone: s.phone ?? "",
                            email: s.email ?? "",
                            address: s.address ?? "",
                            caller_id: s.caller_id ?? "",
                            remote_address: s.remote_address ?? "",
                            local_address: s.local_address ?? "",
                            comment: s.comment ?? "",
                            expires_at: s.expires_at
                              ? new Date(s.expires_at).toISOString().slice(0, 10)
                              : "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={9}>
                    No subscribers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
