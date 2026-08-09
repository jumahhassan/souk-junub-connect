import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Receipt, RefreshCw } from "lucide-react";
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
  getPackages,
  getPayments,
  getReconciliation,
  recordPayment,
  settlePayment,
} from "@/lib/hotspot.functions";
import { detectTelco, formatSSP, relativeTime } from "@/lib/format";

const PROVIDERS = [
  { value: "mtn_momo", label: "MTN MoMo South Sudan" },
  { value: "zain_cash", label: "Zain Cash" },
  { value: "nips", label: "NIPS (Bank of South Sudan)" },
  { value: "tola", label: "Tola Mobile" },
  { value: "cash", label: "Cash collection" },
] as const;

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Record and reconcile SSP hotspot payments from MTN MoMo, Zain Cash, NIPS, Tola Mobile and cash collections with automatic voucher delivery.",
      },
      { property: "og:title", content: "Payments | SOUK JUNUB" },
      {
        property: "og:description",
        content: "South Sudan mobile money and cash reconciliation in SSP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentsPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  processing: "secondary",
  failed: "destructive",
  refunded: "outline",
};

function PaymentsPage() {
  const qc = useQueryClient();
  const load = useServerFn(getPayments);
  const listPackages = useServerFn(getPackages);
  const create = useServerFn(recordPayment);
  const settle = useServerFn(settlePayment);
  const recon = useServerFn(getReconciliation);

  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);

  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: () => load() });
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => listPackages() });
  const { data: report } = useQuery({
    queryKey: ["reconciliation", day],
    queryFn: () => recon({ data: { day } }),
  });

  const [form, setForm] = useState({ provider: "mtn_momo", msisdn: "", packageId: "", note: "" });

  const submit = useMutation({
    mutationFn: () =>
      create({
        data: {
          provider: form.provider as any,
          msisdn: form.msisdn.trim() || null,
          packageId: form.packageId || null,
          note: form.note.trim() || null,
        },
      }),
    onSuccess: (r: any) => {
      toast.success(
        r.voucher ? `Paid. Voucher ${r.voucher.code} delivered.` : "Payment request created.",
      );
      setForm((f) => ({ ...f, msisdn: "", note: "" }));
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["reconciliation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finish = useMutation({
    mutationFn: (payload: any) => settle({ data: payload }),
    onSuccess: () => {
      toast.success("Transaction updated.");
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["reconciliation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: any[] = payments ?? [];
  const telco = form.msisdn ? detectTelco(form.msisdn) : null;

  const exportCsv = () => {
    const header = "reference,provider,msisdn,amount_ssp,status,receipt,created_at\n";
    const body = rows
      .map((p) =>
        [p.reference, p.provider, p.msisdn ?? "", p.amount_ssp, p.status, p.receipt_number ?? "", p.created_at].join(
          ",",
        ),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Payments"
      description="Mobile money, bank transfer and cash collections — all settled in SSP."
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reconcile">Daily reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-2 pt-4">
            {rows.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </CardContent>
              </Card>
            ) : (
              rows.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm">{p.reference}</p>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge>
                        <Badge variant="outline">
                          {PROVIDERS.find((x) => x.value === p.provider)?.label ?? p.provider}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.msisdn ?? "no number"} · {p.hotspot_packages?.name ?? "no package"} ·{" "}
                        {p.vouchers?.code ? `voucher ${p.vouchers.code} · ` : ""}
                        {p.receipt_number ? `receipt ${p.receipt_number} · ` : ""}
                        {relativeTime(p.created_at)}
                        {p.retry_count ? ` · ${p.retry_count} retries` : ""}
                        {p.failure_reason ? ` · ${p.failure_reason}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">
                        {formatSSP(Number(p.amount_ssp))}
                      </span>
                      {p.status !== "success" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => finish.mutate({ paymentId: p.id, outcome: "success" })}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => finish.mutate({ paymentId: p.id, outcome: "retry" })}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              finish.mutate({
                                paymentId: p.id,
                                outcome: "failed",
                                reason: "Provider declined",
                              })
                            }
                          >
                            Fail
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reconcile" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  Daily reconciliation
                  <Input
                    type="date"
                    className="w-44"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(report?.rows ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No transactions on this date.
                  </p>
                ) : (
                  <>
                    {(report?.rows ?? []).map((r: any) => (
                      <div
                        key={r.provider}
                        className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
                      >
                        <span>{PROVIDERS.find((x) => x.value === r.provider)?.label ?? r.provider}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.success}/{r.count} settled · {r.failed} failed
                        </span>
                        <span className="font-mono text-primary">{formatSSP(r.total)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                      <span>Total collected</span>
                      <span className="font-mono text-primary">
                        {formatSSP((report?.rows ?? []).reduce((a: number, r: any) => a + r.total, 0))}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Record payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone number</Label>
              <Input
                value={form.msisdn}
                placeholder="+211 92X XXX XXX"
                onChange={(e) => setForm((f) => ({ ...f, msisdn: e.target.value }))}
              />
              {telco ? (
                <p className="mt-1 text-xs text-muted-foreground">Detected network: {telco}</p>
              ) : null}
            </div>
            <div>
              <Label>Package</Label>
              <Select value={form.packageId} onValueChange={(v) => setForm((f) => ({ ...f, packageId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose package" />
                </SelectTrigger>
                <SelectContent>
                  {(packages ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatSSP(Number(p.price_ssp))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.packageId || submit.isPending}
              onClick={() => submit.mutate()}
            >
              <Receipt className="mr-1.5 h-4 w-4" />
              {form.provider === "cash" ? "Record cash payment" : "Request payment"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Confirmed payments automatically issue and attach a voucher code for delivery to the
              customer.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
