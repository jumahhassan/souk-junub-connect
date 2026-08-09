/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSSP } from "@/lib/format";
import {
  deleteStaticIp,
  getStaticIps,
  releaseStaticIp,
  saveStaticIp,
} from "@/lib/pppoe.functions";

const EMPTY = {
  id: undefined as string | undefined,
  ip_address: "",
  subscriber_id: "",
  router_id: "",
  mac_address: "",
  label: "",
  monthly_fee_ssp: 25000,
  status: "assigned" as "assigned" | "reserved" | "released",
  notes: "",
};

export const Route = createFileRoute("/_authenticated/static-ips")({
  head: () => ({
    meta: [
      { title: "Static IP management | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Assign dedicated static IPs to business customers, bind them to MAC addresses, track allocations per router and bill SSP add-on fees.",
      },
      { property: "og:title", content: "Static IP management | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Dedicated IP allocation, MAC binding and SSP add-on billing for business clients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaticIpsPage,
});

function StaticIpsPage() {
  const qc = useQueryClient();
  const list = useServerFn(getStaticIps);
  const persist = useServerFn(saveStaticIp);
  const release = useServerFn(releaseStaticIp);
  const remove = useServerFn(deleteStaticIp);

  const { data } = useQuery({ queryKey: ["static-ips"], queryFn: () => list() });
  const allocations = ((data as any)?.allocations ?? []) as any[];
  const routers = ((data as any)?.routers ?? []) as any[];
  const subscribers = ((data as any)?.subscribers ?? []) as any[];

  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["static-ips"] });

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(form.id ? { id: form.id } : {}),
          ip_address: form.ip_address.trim(),
          subscriber_id: form.subscriber_id || null,
          router_id: form.router_id || null,
          mac_address: form.mac_address.trim() || null,
          label: form.label.trim() || null,
          monthly_fee_ssp: Number(form.monthly_fee_ssp),
          status: form.status,
          notes: form.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Allocation saved");
      setOpen(false);
      setForm(EMPTY);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save allocation"),
  });

  const doRelease = useMutation({
    mutationFn: (allocationId: string) => release({ data: { allocationId } }),
    onSuccess: () => {
      toast.success("IP released back to the pool");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not release IP"),
  });

  const del = useMutation({
    mutationFn: (allocationId: string) => remove({ data: { allocationId } }),
    onSuccess: () => {
      toast.success("Allocation deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete allocation"),
  });

  const monthlyRevenue = allocations
    .filter((a) => a.status === "assigned")
    .reduce((sum, a) => sum + Number(a.monthly_fee_ssp ?? 0), 0);

  const byRouter = new Map<string, number>();
  for (const a of allocations) {
    const key = a.routers?.name ?? "Unassigned";
    byRouter.set(key, (byRouter.get(key) ?? 0) + 1);
  }

  return (
    <AppShell
      title="Static IP management"
      description="Dedicated addresses for business customers, tracked per router and billed monthly in SSP."
      actions={
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen((v) => !v);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Allocate IP
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Allocations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{allocations.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Monthly add-on revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">
            {formatSSP(monthlyRevenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Per router
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {[...byRouter.entries()].map(([name, count]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span>{count}</span>
              </div>
            ))}
            {byRouter.size === 0 && <span className="text-muted-foreground">No allocations</span>}
          </CardContent>
        </Card>
      </div>

      {open && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{form.id ? "Edit allocation" : "Allocate static IP"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>IP address</Label>
              <Input
                value={form.ip_address}
                placeholder="102.68.20.14"
                onChange={(e) => set({ ip_address: e.target.value })}
              />
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
              <Label>Subscriber</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.subscriber_id}
                onChange={(e) => set({ subscriber_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.username} {s.full_name ? `· ${s.full_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Bind to MAC</Label>
              <Input
                value={form.mac_address}
                placeholder="AA:BB:CC:DD:EE:FF"
                onChange={(e) => set({ mac_address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={form.label}
                placeholder="Juba Grand Hotel"
                onChange={(e) => set({ label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly fee (SSP)</Label>
              <Input
                type="number"
                value={form.monthly_fee_ssp}
                onChange={(e) => set({ monthly_fee_ssp: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => set({ status: e.target.value as any })}
              >
                <option value="assigned">Assigned</option>
                <option value="reserved">Reserved</option>
                <option value="released">Released</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.ip_address.trim()}
              >
                {save.isPending ? "Saving…" : "Save allocation"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IP allocations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">IP address</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Router</th>
                <th className="px-4 py-2">MAC binding</th>
                <th className="px-4 py-2">Monthly fee</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="px-4 py-2 font-mono text-xs">{a.ip_address}</td>
                  <td className="px-4 py-2">
                    {a.pppoe_subscribers?.full_name ?? a.pppoe_subscribers?.username ?? a.label ?? "—"}
                  </td>
                  <td className="px-4 py-2">{a.routers?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.mac_address ?? "—"}</td>
                  <td className="px-4 py-2">{formatSSP(Number(a.monthly_fee_ssp ?? 0))}</td>
                  <td className="px-4 py-2">
                    <Badge variant={a.status === "assigned" ? "secondary" : "outline"}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Release"
                        onClick={() => doRelease.mutate(a.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            ...EMPTY,
                            ...a,
                            subscriber_id: a.subscriber_id ?? "",
                            router_id: a.router_id ?? "",
                            mac_address: a.mac_address ?? "",
                            label: a.label ?? "",
                            notes: a.notes ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                    No static IPs allocated yet.
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
