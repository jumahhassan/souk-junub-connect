/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deletePppoePlan, getPppoePlans, savePppoePlan } from "@/lib/pppoe.functions";
import { formatSSP } from "@/lib/format";

const CYCLES = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  profile_name: "",
  download_kbps: 5120,
  upload_kbps: 2048,
  burst_download_kbps: 0,
  burst_upload_kbps: 0,
  burst_threshold_download_kbps: 0,
  burst_threshold_upload_kbps: 0,
  burst_time_seconds: 0,
  local_address: "",
  remote_address_pool: "sj-pppoe-pool",
  dns_servers: "8.8.8.8,1.1.1.1",
  change_tcp_mss: true,
  use_compression: false,
  use_encryption: false,
  only_one: true,
  billing_type: "prepaid" as "prepaid" | "postpaid",
  billing_cycle: "monthly" as (typeof CYCLES)[number],
  price_ssp: 45000,
  fup_enabled: false,
  fup_after_gb: 0,
  fup_download_kbps: 1024,
  fup_upload_kbps: 512,
  is_active: true,
  sort_order: 0,
};

function mbps(kbps: number) {
  return `${(kbps / 1024).toFixed(kbps % 1024 === 0 ? 0 : 1)}M`;
}

export const Route = createFileRoute("/_authenticated/pppoe-plans")({
  head: () => ({
    meta: [
      { title: "PPPoE plans | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Build PPPoE bandwidth profiles with burst limits, address pools, DNS and TCP MSS control, priced in SSP across daily to annual billing cycles.",
      },
      { property: "og:title", content: "PPPoE plans | SOUK JUNUB" },
      {
        property: "og:description",
        content: "SSP-priced PPPoE profiles with burst, FUP and prepaid or postpaid billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PppoePlansPage,
});

function PppoePlansPage() {
  const qc = useQueryClient();
  const list = useServerFn(getPppoePlans);
  const persist = useServerFn(savePppoePlan);
  const remove = useServerFn(deletePppoePlan);

  const { data } = useQuery({ queryKey: ["pppoe-plans"], queryFn: () => list() });
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name.trim(),
          description: form.description.trim() || null,
          profile_name: form.profile_name.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-"),
          download_kbps: Number(form.download_kbps),
          upload_kbps: Number(form.upload_kbps),
          burst_download_kbps: Number(form.burst_download_kbps) || null,
          burst_upload_kbps: Number(form.burst_upload_kbps) || null,
          burst_threshold_download_kbps: Number(form.burst_threshold_download_kbps) || null,
          burst_threshold_upload_kbps: Number(form.burst_threshold_upload_kbps) || null,
          burst_time_seconds: Number(form.burst_time_seconds) || null,
          local_address: form.local_address.trim() || null,
          remote_address_pool: form.remote_address_pool.trim() || null,
          dns_servers: form.dns_servers.trim() || null,
          change_tcp_mss: form.change_tcp_mss,
          use_compression: form.use_compression,
          use_encryption: form.use_encryption,
          only_one: form.only_one,
          billing_type: form.billing_type,
          billing_cycle: form.billing_cycle,
          price_ssp: Number(form.price_ssp),
          fup_enabled: form.fup_enabled,
          fup_after_gb: Number(form.fup_after_gb) || null,
          fup_download_kbps: Number(form.fup_download_kbps) || null,
          fup_upload_kbps: Number(form.fup_upload_kbps) || null,
          is_active: form.is_active,
          sort_order: Number(form.sort_order),
        },
      }),
    onSuccess: () => {
      toast.success("Plan saved");
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["pppoe-plans"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save plan"),
  });

  const del = useMutation({
    mutationFn: (planId: string) => remove({ data: { planId } }),
    onSuccess: () => {
      toast.success("Plan removed");
      qc.invalidateQueries({ queryKey: ["pppoe-plans"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove plan"),
  });

  const plans = (data as any[]) ?? [];

  return (
    <AppShell
      title="PPPoE plans"
      description="Bandwidth profiles, burst behaviour and SSP pricing for fixed-line subscribers."
      actions={
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen((v) => !v);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New plan
        </Button>
      }
    >
      {open && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{form.id ? "Edit plan" : "Create PPPoE plan"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Plan name</Label>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>RouterOS profile name</Label>
              <Input
                value={form.profile_name}
                placeholder="sj-home-5m"
                onChange={(e) => set({ profile_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price (SSP)</Label>
              <Input
                type="number"
                value={form.price_ssp}
                onChange={(e) => set({ price_ssp: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Download (kbps)</Label>
              <Input
                type="number"
                value={form.download_kbps}
                onChange={(e) => set({ download_kbps: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Upload (kbps)</Label>
              <Input
                type="number"
                value={form.upload_kbps}
                onChange={(e) => set({ upload_kbps: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Burst time (s)</Label>
              <Input
                type="number"
                value={form.burst_time_seconds}
                onChange={(e) => set({ burst_time_seconds: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Burst download (kbps)</Label>
              <Input
                type="number"
                value={form.burst_download_kbps}
                onChange={(e) => set({ burst_download_kbps: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Burst upload (kbps)</Label>
              <Input
                type="number"
                value={form.burst_upload_kbps}
                onChange={(e) => set({ burst_upload_kbps: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Burst thresholds (down / up kbps)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.burst_threshold_download_kbps}
                  onChange={(e) => set({ burst_threshold_download_kbps: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={form.burst_threshold_upload_kbps}
                  onChange={(e) => set({ burst_threshold_upload_kbps: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Local address</Label>
              <Input
                value={form.local_address}
                placeholder="10.60.0.1"
                onChange={(e) => set({ local_address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remote address pool</Label>
              <Input
                value={form.remote_address_pool}
                onChange={(e) => set({ remote_address_pool: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>DNS servers</Label>
              <Input value={form.dns_servers} onChange={(e) => set({ dns_servers: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Billing type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.billing_type}
                onChange={(e) => set({ billing_type: e.target.value as any })}
              >
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid (invoiced)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing cycle</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.billing_cycle}
                onChange={(e) => set({ billing_cycle: e.target.value as any })}
              >
                {CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c[0]!.toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => set({ sort_order: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Change TCP MSS</span>
              <Switch
                checked={form.change_tcp_mss}
                onCheckedChange={(v) => set({ change_tcp_mss: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Use compression</span>
              <Switch
                checked={form.use_compression}
                onCheckedChange={(v) => set({ use_compression: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Use encryption</span>
              <Switch
                checked={form.use_encryption}
                onCheckedChange={(v) => set({ use_encryption: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">One session only</span>
              <Switch checked={form.only_one} onCheckedChange={(v) => set({ only_one: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Fair usage policy</span>
              <Switch checked={form.fup_enabled} onCheckedChange={(v) => set({ fup_enabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Plan active</span>
              <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
            </div>

            {form.fup_enabled && (
              <>
                <div className="space-y-1.5">
                  <Label>Throttle after (GB)</Label>
                  <Input
                    type="number"
                    value={form.fup_after_gb}
                    onChange={(e) => set({ fup_after_gb: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>FUP download (kbps)</Label>
                  <Input
                    type="number"
                    value={form.fup_download_kbps}
                    onChange={(e) => set({ fup_download_kbps: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>FUP upload (kbps)</Label>
                  <Input
                    type="number"
                    value={form.fup_upload_kbps}
                    onChange={(e) => set({ fup_upload_kbps: Number(e.target.value) })}
                  />
                </div>
              </>
            )}

            <div className="md:col-span-3 flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
                {save.isPending ? "Saving…" : "Save plan"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{p.profile_name}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setForm({
                      ...EMPTY,
                      ...p,
                      description: p.description ?? "",
                      local_address: p.local_address ?? "",
                      remote_address_pool: p.remote_address_pool ?? "",
                      dns_servers: p.dns_servers ?? "",
                      burst_download_kbps: p.burst_download_kbps ?? 0,
                      burst_upload_kbps: p.burst_upload_kbps ?? 0,
                      burst_threshold_download_kbps: p.burst_threshold_download_kbps ?? 0,
                      burst_threshold_upload_kbps: p.burst_threshold_upload_kbps ?? 0,
                      burst_time_seconds: p.burst_time_seconds ?? 0,
                      fup_after_gb: p.fup_after_gb ?? 0,
                      fup_download_kbps: p.fup_download_kbps ?? 0,
                      fup_upload_kbps: p.fup_upload_kbps ?? 0,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-2xl font-bold text-primary">{formatSSP(Number(p.price_ssp))}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {mbps(p.download_kbps)}/{mbps(p.upload_kbps)}
                </Badge>
                <Badge variant="outline">{p.billing_cycle}</Badge>
                <Badge variant="outline">{p.billing_type}</Badge>
                {p.fup_enabled && <Badge variant="outline">FUP {p.fup_after_gb ?? 0} GB</Badge>}
                {!p.is_active && <Badge variant="destructive">Inactive</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {p.subscriber_count} subscriber(s) · pool {p.remote_address_pool ?? "—"} · DNS{" "}
                {p.dns_servers ?? "—"}
              </p>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-muted-foreground">No PPPoE plans yet.</p>
        )}
      </div>
    </AppShell>
  );
}
