/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Boxes, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  allocateVouchers,
  decidePayout,
  deleteReseller,
  getPayouts,
  getResellers,
  saveCommissionRule,
  saveReseller,
  settleAllCommissions,
} from "@/lib/reseller.functions";
import { getVoucherBatches, getPackages } from "@/lib/hotspot.functions";
import { formatSSP, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/resellers")({
  head: () => ({
    meta: [
      { title: "Voucher Agents & Resellers | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Manage master agents, sub-agents and retailers: allocate voucher inventory, set SSP commission structures and settle payouts.",
      },
      { property: "og:title", content: "Voucher Agents & Resellers | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Agent hierarchy, voucher allocation and commission settlement in SSP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResellersPage,
});

const TIERS = [
  { value: "master", label: "Master agent" },
  { value: "sub", label: "Sub-agent" },
  { value: "retailer", label: "Retailer" },
] as const;

const EMPTY = {
  full_name: "",
  code: "",
  phone: "",
  email: "",
  area: "",
  tier: "retailer",
  parent_id: "",
  commission_type: "percent",
  commission_rate: 10,
  status: "active",
  notes: "",
};

function ResellersPage() {
  const qc = useQueryClient();
  const loadResellers = useServerFn(getResellers);
  const loadPayouts = useServerFn(getPayouts);
  const loadBatches = useServerFn(getVoucherBatches);
  const loadPackages = useServerFn(getPackages);
  const save = useServerFn(saveReseller);
  const remove = useServerFn(deleteReseller);
  const allocate = useServerFn(allocateVouchers);
  const decide = useServerFn(decidePayout);
  const settle = useServerFn(settleAllCommissions);
  const saveRule = useServerFn(saveCommissionRule);

  const { data: resellers } = useQuery({ queryKey: ["resellers"], queryFn: () => loadResellers() });
  const { data: payouts } = useQuery({ queryKey: ["payouts"], queryFn: () => loadPayouts() });
  const { data: batches } = useQuery({ queryKey: ["voucher-batches"], queryFn: () => loadBatches() });
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => loadPackages() });

  const [form, setForm] = useState<any>(EMPTY);
  const [alloc, setAlloc] = useState({ resellerId: "", batchId: "", quantity: 50 });
  const [rule, setRule] = useState({ resellerId: "", packageId: "", commissionType: "percent", commissionRate: 10 });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["resellers"] });
    void qc.invalidateQueries({ queryKey: ["payouts"] });
  };

  const upsert = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          full_name: form.full_name.trim(),
          code: form.code.trim() || undefined,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          area: form.area.trim() || null,
          tier: form.tier,
          parent_id: form.parent_id || null,
          commission_type: form.commission_type,
          commission_rate: Number(form.commission_rate),
          status: form.status,
          user_id: null,
          notes: form.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Agent saved.");
      setForm(EMPTY);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (resellerId: string) => remove({ data: { resellerId } }),
    onSuccess: () => {
      toast.success("Agent removed.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allocateNow = useMutation({
    mutationFn: () =>
      allocate({
        data: {
          resellerId: alloc.resellerId,
          batchId: alloc.batchId,
          quantity: Number(alloc.quantity),
        },
      }),
    onSuccess: (r: any) => {
      toast.success(`${r.allocated} vouchers allocated.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideNow = useMutation({
    mutationFn: (payload: any) => decide({ data: payload }),
    onSuccess: () => {
      toast.success("Payout updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settleNow = useMutation({
    mutationFn: (resellerId: string) => settle({ data: { resellerId, method: "mtn_momo" } }),
    onSuccess: (r: any) => {
      toast.success(`Settled ${formatSSP(r.amount)} across ${r.count} sales.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRuleNow = useMutation({
    mutationFn: () =>
      saveRule({
        data: {
          resellerId: rule.resellerId,
          packageId: rule.packageId,
          commissionType: rule.commissionType as any,
          commissionRate: Number(rule.commissionRate),
        },
      }),
    onSuccess: () => toast.success("Commission rule saved."),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: any[] = resellers ?? [];

  return (
    <AppShell
      title="Voucher agents & resellers"
      description="Master agents, sub-agents and retailers — inventory, commissions and payouts in SSP."
    >
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="inventory">Allocate inventory</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-2">
              {rows.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No agents yet. Create your first reseller on the right.
                  </CardContent>
                </Card>
              ) : (
                rows.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{r.full_name}</p>
                          <Badge variant="outline" className="font-mono text-[11px]">{r.code}</Badge>
                          <Badge variant={r.tier === "master" ? "default" : "secondary"}>
                            {TIERS.find((t) => t.value === r.tier)?.label}
                          </Badge>
                          <Badge variant={r.status === "active" ? "outline" : "destructive"}>
                            {r.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.phone ?? "no phone"} · {r.area ?? "no area"} ·{" "}
                          {r.commission_type === "percent"
                            ? `${r.commission_rate}% commission`
                            : `${formatSSP(Number(r.commission_rate))} per sale`}{" "}
                          · {r.stats.allocated} allocated · {r.stats.sales} sold ·{" "}
                          {formatSSP(r.stats.revenue)} revenue
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-mono text-sm text-primary">{formatSSP(r.stats.payable)}</p>
                          <p className="text-[11px] text-muted-foreground">payable</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => settleNow.mutate(r.id)}>
                          <Wallet className="mr-1.5 h-3.5 w-3.5" />
                          Settle
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setForm({ ...EMPTY, ...r, parent_id: r.parent_id ?? "", phone: r.phone ?? "", email: r.email ?? "", area: r.area ?? "", notes: r.notes ?? "" })}>
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${r.full_name}`}
                          onClick={() => drop.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Per-package commission override</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  <Select value={rule.resellerId} onValueChange={(v) => setRule((s) => ({ ...s, resellerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Agent" /></SelectTrigger>
                    <SelectContent>
                      {rows.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={rule.packageId} onValueChange={(v) => setRule((s) => ({ ...s, packageId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Package" /></SelectTrigger>
                    <SelectContent>
                      {(packages ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Select value={rule.commissionType} onValueChange={(v) => setRule((s) => ({ ...s, commissionType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">SSP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={rule.commissionRate}
                      onChange={(e) => setRule((s) => ({ ...s, commissionRate: Number(e.target.value) }))}
                    />
                  </div>
                  <Button
                    disabled={!rule.resellerId || !rule.packageId || saveRuleNow.isPending}
                    onClick={() => saveRuleNow.mutate()}
                  >
                    Save rule
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{form.id ? "Edit agent" : "New agent"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} placeholder="+211 92X XXX XXX" onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Input value={form.area} placeholder="Juba, Konyo Konyo" onChange={(e) => setForm((f: any) => ({ ...f, area: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tier</Label>
                    <Select value={form.tier} onValueChange={(v) => setForm((f: any) => ({ ...f, tier: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reports to</Label>
                    <Select value={form.parent_id} onValueChange={(v) => setForm((f: any) => ({ ...f, parent_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {rows.filter((r) => r.id !== form.id).map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Commission</Label>
                    <Select value={form.commission_type} onValueChange={(v) => setForm((f: any) => ({ ...f, commission_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed SSP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rate</Label>
                    <Input type="number" value={form.commission_rate} onChange={(e) => setForm((f: any) => ({ ...f, commission_rate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={form.full_name.trim().length < 2 || upsert.isPending} onClick={() => upsert.mutate()}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {form.id ? "Save agent" : "Create agent"}
                  </Button>
                  {form.id ? (
                    <Button variant="ghost" onClick={() => setForm(EMPTY)}>Cancel</Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="pt-4">
          <Card className="max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Allocate voucher inventory</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <Select value={alloc.resellerId} onValueChange={(v) => setAlloc((s) => ({ ...s, resellerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Agent" /></SelectTrigger>
                <SelectContent>
                  {rows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={alloc.batchId} onValueChange={(v) => setAlloc((s) => ({ ...s, batchId: v }))}>
                <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                <SelectContent>
                  {(batches ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.stats?.unused ?? 0} unused)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={alloc.quantity}
                onChange={(e) => setAlloc((s) => ({ ...s, quantity: Number(e.target.value) }))}
              />
              <Button
                disabled={!alloc.resellerId || !alloc.batchId || allocateNow.isPending}
                onClick={() => allocateNow.mutate()}
              >
                <Boxes className="mr-1.5 h-4 w-4" />
                Allocate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-2 pt-4">
          {(payouts ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No payout requests yet.
              </CardContent>
            </Card>
          ) : (
            (payouts ?? []).map((p: any) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.resellers?.full_name ?? "Agent"}</p>
                      <Badge
                        variant={
                          p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.method} · {p.destination ?? p.resellers?.phone ?? "no destination"} ·{" "}
                      {relativeTime(p.created_at)}
                      {p.reference ? ` · ref ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{formatSSP(Number(p.amount_ssp))}</span>
                    {p.status !== "paid" && p.status !== "rejected" ? (
                      <>
                        <Button size="sm" onClick={() => decideNow.mutate({ payoutId: p.id, decision: "paid" })}>
                          Mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decideNow.mutate({ payoutId: p.id, decision: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => decideNow.mutate({ payoutId: p.id, decision: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
