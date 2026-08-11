/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Banknote, ShoppingCart } from "lucide-react";
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
import { getMyResellerPortal, requestPayout, sellVoucher } from "@/lib/reseller.functions";
import { formatSSP, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/agent-portal")({
  head: () => ({
    meta: [
      { title: "Agent Portal | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Self-serve portal for SOUK JUNUB voucher agents: sell vouchers, track sales and commission earnings in SSP, and request payouts.",
      },
      { property: "og:title", content: "Agent Portal | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Voucher inventory, sales history and commission payouts for Souk Junub agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPortalPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-lg text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function AgentPortalPage() {
  const qc = useQueryClient();
  const load = useServerFn(getMyResellerPortal);
  const sell = useServerFn(sellVoucher);
  const payout = useServerFn(requestPayout);

  const { data } = useQuery({ queryKey: ["agent-portal"], queryFn: () => load(), refetchInterval: 30000 });
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mtn_momo");

  const sellNow = useMutation({
    mutationFn: (voucherId: string) =>
      sell({ data: { voucherId, customerPhone: phone.trim() || null } }),
    onSuccess: (r: any) => {
      toast.success(`Sold ${r.code} — commission ${formatSSP(r.commission)}`);
      setPhone("");
      void qc.invalidateQueries({ queryKey: ["agent-portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const askPayout = useMutation({
    mutationFn: () => payout({ data: { amount: Number(amount), method } }),
    onSuccess: () => {
      toast.success("Payout requested.");
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["agent-portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (data && !data.reseller) {
    return (
      <AppShell title="Agent portal" description="Sell vouchers and track your commissions.">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No agent account is linked to this login. Ask a SOUK JUNUB administrator to link your
            account on the Agents &amp; resellers page.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const t = data?.totals;
  const stock = (data?.inventory ?? []).filter((v: any) => v.state === "unused");

  return (
    <AppShell
      title={`Agent portal${data?.reseller ? ` — ${data.reseller.full_name}` : ""}`}
      description="Your voucher stock, sales history and commission earnings in SSP."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="In stock" value={String(t?.inStock ?? 0)} />
        <Stat label="Sold" value={String(t?.sold ?? 0)} />
        <Stat label="Revenue" value={formatSSP(t?.revenue ?? 0)} />
        <Stat label="Commission earned" value={formatSSP(t?.earned ?? 0)} />
        <Stat label="Payable now" value={formatSSP(t?.payable ?? 0)} />
      </div>

      <Tabs defaultValue="sell">
        <TabsList>
          <TabsTrigger value="sell">Sell vouchers</TabsTrigger>
          <TabsTrigger value="sales">Sales history</TabsTrigger>
          <TabsTrigger value="payouts">Commission payouts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="sell" className="space-y-3 pt-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 py-4">
              <div className="min-w-[220px] flex-1">
                <Label>Customer phone (optional)</Label>
                <Input value={phone} placeholder="+211 92X XXX XXX" onChange={(e) => setPhone(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Selling a voucher activates it and books your commission instantly.
              </p>
            </CardContent>
          </Card>

          {stock.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No vouchers in your stock. Request an allocation from your master agent.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stock.slice(0, 120).map((v: any) => (
                <Card key={v.id}>
                  <CardContent className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{v.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.hotspot_packages?.name ?? "package"} · {formatSSP(Number(v.price_ssp))}
                      </p>
                    </div>
                    <Button size="sm" disabled={sellNow.isPending} onClick={() => sellNow.mutate(v.id)}>
                      <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                      Sell
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-2 pt-4">
          {(data?.sales ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No sales recorded yet.
              </CardContent>
            </Card>
          ) : (
            (data?.sales ?? []).map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-sm">{s.vouchers?.code ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.hotspot_packages?.name ?? "package"} · {s.customer_phone ?? "walk-in"} ·{" "}
                      {relativeTime(s.sold_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatSSP(Number(s.price_ssp))}</span>
                    <span className="font-mono text-sm text-primary">
                      +{formatSSP(Number(s.commission_ssp))}
                    </span>
                    <Badge variant={s.settled ? "default" : "secondary"}>
                      {s.settled ? "settled" : "payable"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-3 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Request a payout</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Amount (SSP)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="min-w-[180px]">
                <Label>Send to</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="zain_cash">Zain Cash</SelectItem>
                    <SelectItem value="nips">Bank (NIPS)</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!amount || Number(amount) <= 0 || askPayout.isPending}
                onClick={() => askPayout.mutate()}
              >
                <Banknote className="mr-1.5 h-4 w-4" />
                Request payout
              </Button>
            </CardContent>
          </Card>

          {(data?.payouts ?? []).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-mono text-sm text-primary">{formatSSP(Number(p.amount_ssp))}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.method} · {relativeTime(p.created_at)}
                  </p>
                </div>
                <Badge
                  variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}
                >
                  {p.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="performance" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.topProducts ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                (data?.topProducts ?? []).map((p: any) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.count} sold</span>
                    <span className="font-mono text-primary">{formatSSP(p.revenue)}</span>
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
