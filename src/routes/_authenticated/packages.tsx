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
import { deletePackage, getPackages, savePackage } from "@/lib/hotspot.functions";
import { formatSSP } from "@/lib/format";

type Kind = "time" | "data" | "combo";

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  kind: "time" as Kind,
  duration_minutes: 60,
  data_cap_mb: 1024,
  price_ssp: 50,
  validity_days: 1,
  download_kbps: 2048,
  upload_kbps: 1024,
  burst_download_kbps: 0,
  burst_upload_kbps: 0,
  burst_threshold_download_kbps: 0,
  burst_threshold_upload_kbps: 0,
  burst_time_seconds: 0,
  fup_enabled: false,
  fup_after_mb: 0,
  fup_download_kbps: 1024,
  fup_upload_kbps: 512,
  shared_users: 1,
  is_active: true,
  sort_order: 0,
};

function describe(p: any) {
  const bits: string[] = [];
  if (p.duration_minutes)
    bits.push(
      p.duration_minutes >= 1440
        ? `${Math.round(p.duration_minutes / 1440)} day(s)`
        : `${Math.round(p.duration_minutes / 60)} hour(s)`,
    );
  if (p.data_cap_mb)
    bits.push(p.data_cap_mb >= 1024 ? `${(p.data_cap_mb / 1024).toFixed(0)} GB` : `${p.data_cap_mb} MB`);
  if (!p.data_cap_mb && p.kind === "data") bits.push("Unlimited data");
  return bits.join(" · ") || "—";
}

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({
    meta: [
      { title: "Hotspot packages | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Create time, data and combo hotspot packages priced in SSP with bandwidth profiles, burst limits and fair usage throttling.",
      },
      { property: "og:title", content: "Hotspot packages | SOUK JUNUB" },
      {
        property: "og:description",
        content: "SSP-priced hotspot plans with speed profiles and fair usage policy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PackagesPage,
});

function PackagesPage() {
  const qc = useQueryClient();
  const list = useServerFn(getPackages);
  const persist = useServerFn(savePackage);
  const remove = useServerFn(deletePackage);

  const { data } = useQuery({ queryKey: ["packages"], queryFn: () => list() });
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
          kind: form.kind,
          duration_minutes: form.kind === "data" ? null : Number(form.duration_minutes) || null,
          data_cap_mb: form.kind === "time" ? null : Number(form.data_cap_mb) || null,
          price_ssp: Number(form.price_ssp),
          validity_days: Number(form.validity_days) || null,
          download_kbps: Number(form.download_kbps),
          upload_kbps: Number(form.upload_kbps),
          burst_download_kbps: Number(form.burst_download_kbps) || null,
          burst_upload_kbps: Number(form.burst_upload_kbps) || null,
          burst_threshold_download_kbps: Number(form.burst_threshold_download_kbps) || null,
          burst_threshold_upload_kbps: Number(form.burst_threshold_upload_kbps) || null,
          burst_time_seconds: Number(form.burst_time_seconds) || null,
          fup_enabled: form.fup_enabled,
          fup_after_mb: Number(form.fup_after_mb) || null,
          fup_download_kbps: Number(form.fup_download_kbps) || null,
          fup_upload_kbps: Number(form.fup_upload_kbps) || null,
          shared_users: Number(form.shared_users),
          is_active: form.is_active,
          sort_order: Number(form.sort_order),
        },
      }),
    onSuccess: () => {
      toast.success("Package saved.");
      setForm(EMPTY);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (packageId: string) => remove({ data: { packageId } }),
    onSuccess: () => {
      toast.success("Package deleted.");
      void qc.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const packages: any[] = data ?? [];

  return (
    <AppShell
      title="Hotspot packages"
      description="Time, data and combo plans priced in South Sudanese Pounds."
      actions={
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen((v) => !v);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New package
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {packages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No packages yet.
              </CardContent>
            </Card>
          ) : (
            packages.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{p.name}</p>
                      <Badge variant="outline" className="uppercase">
                        {p.kind}
                      </Badge>
                      {p.fup_enabled ? <Badge variant="secondary">FUP</Badge> : null}
                      {!p.is_active ? <Badge variant="destructive">inactive</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {describe(p)} · {(p.download_kbps / 1024).toFixed(1)}/
                      {(p.upload_kbps / 1024).toFixed(1)} Mbps
                      {p.validity_days ? ` · valid ${p.validity_days}d` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-primary">{formatSSP(Number(p.price_ssp))}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          ...EMPTY,
                          ...p,
                          description: p.description ?? "",
                          duration_minutes: p.duration_minutes ?? 0,
                          data_cap_mb: p.data_cap_mb ?? 0,
                          price_ssp: Number(p.price_ssp),
                          burst_download_kbps: p.burst_download_kbps ?? 0,
                          burst_upload_kbps: p.burst_upload_kbps ?? 0,
                          burst_threshold_download_kbps: p.burst_threshold_download_kbps ?? 0,
                          burst_threshold_upload_kbps: p.burst_threshold_upload_kbps ?? 0,
                          burst_time_seconds: p.burst_time_seconds ?? 0,
                          fup_after_mb: p.fup_after_mb ?? 0,
                          fup_download_kbps: p.fup_download_kbps ?? 1024,
                          fup_upload_kbps: p.fup_upload_kbps ?? 512,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => drop.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {open ? (
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{form.id ? "Edit package" : "New package"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <div className="mt-1 flex gap-2">
                  {(["time", "data", "combo"] as Kind[]).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={form.kind === k ? "default" : "outline"}
                      onClick={() => set({ kind: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {form.kind !== "data" ? (
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => set({ duration_minutes: Number(e.target.value) })}
                    />
                  </div>
                ) : null}
                {form.kind !== "time" ? (
                  <div>
                    <Label>Data cap (MB, 0 = unlimited)</Label>
                    <Input
                      type="number"
                      value={form.data_cap_mb}
                      onChange={(e) => set({ data_cap_mb: Number(e.target.value) })}
                    />
                  </div>
                ) : null}
                <div>
                  <Label>Price (SSP)</Label>
                  <Input
                    type="number"
                    value={form.price_ssp}
                    onChange={(e) => set({ price_ssp: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Validity (days)</Label>
                  <Input
                    type="number"
                    value={form.validity_days}
                    onChange={(e) => set({ validity_days: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Download (kbps)</Label>
                  <Input
                    type="number"
                    value={form.download_kbps}
                    onChange={(e) => set({ download_kbps: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Upload (kbps)</Label>
                  <Input
                    type="number"
                    value={form.upload_kbps}
                    onChange={(e) => set({ upload_kbps: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Burst down (kbps)</Label>
                  <Input
                    type="number"
                    value={form.burst_download_kbps}
                    onChange={(e) => set({ burst_download_kbps: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Burst up (kbps)</Label>
                  <Input
                    type="number"
                    value={form.burst_upload_kbps}
                    onChange={(e) => set({ burst_upload_kbps: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Burst threshold down</Label>
                  <Input
                    type="number"
                    value={form.burst_threshold_download_kbps}
                    onChange={(e) => set({ burst_threshold_download_kbps: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Burst time (s)</Label>
                  <Input
                    type="number"
                    value={form.burst_time_seconds}
                    onChange={(e) => set({ burst_time_seconds: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Shared users</Label>
                  <Input
                    type="number"
                    value={form.shared_users}
                    onChange={(e) => set({ shared_users: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => set({ sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Fair Usage Policy</p>
                  <p className="text-xs text-muted-foreground">Throttle after the data threshold.</p>
                </div>
                <Switch checked={form.fup_enabled} onCheckedChange={(v) => set({ fup_enabled: v })} />
              </div>
              {form.fup_enabled ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>After (MB)</Label>
                    <Input
                      type="number"
                      value={form.fup_after_mb}
                      onChange={(e) => set({ fup_after_mb: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Down kbps</Label>
                    <Input
                      type="number"
                      value={form.fup_download_kbps}
                      onChange={(e) => set({ fup_download_kbps: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Up kbps</Label>
                    <Input
                      type="number"
                      value={form.fup_upload_kbps}
                      onChange={(e) => set({ fup_upload_kbps: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-sm">Active</p>
                <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
              </div>
              <Button
                className="w-full"
                disabled={!form.name.trim() || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save package"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
