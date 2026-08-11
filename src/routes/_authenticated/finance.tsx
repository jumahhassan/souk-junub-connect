/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateInvoices, getFinanceReport } from "@/lib/finance.functions";
import { formatSSP, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Finance & Reports | SOUK JUNUB" },
      {
        name: "description",
        content:
          "SSP revenue reporting for SOUK JUNUB: daily and period transactions, revenue per router and package, payment method breakdown, outstanding postpaid balances and invoices.",
      },
      { property: "og:title", content: "Finance & Reports | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Income today, this week, month and year — all in South Sudanese Pounds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-lg text-primary">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: any[] }) {
  const total = rows.reduce((a, r) => a + r.total, 0) || 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data in this range.</p>
        ) : (
          rows.map((r) => (
            <div key={r.name ?? r.provider} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{r.name ?? r.provider}</span>
                <span className="font-mono text-primary">{formatSSP(r.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(r.total / total) * 100}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{r.count} transactions</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FinancePage() {
  const qc = useQueryClient();
  const load = useServerFn(getFinanceReport);
  const invoice = useServerFn(generateInvoices);

  const monthStart = new Date();
  monthStart.setDate(1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["finance", from, to],
    queryFn: () => load({ data: { from, to } }),
  });

  const run = useMutation({
    mutationFn: () => invoice(),
    onSuccess: (r: any) => {
      toast.success(`${r.created} postpaid invoices generated.`);
      void qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = data?.totals;

  const exportCsv = () => {
    const header = "reference,provider,msisdn,amount_ssp,status,receipt,created_at\n";
    const body = (data?.payments ?? [])
      .map((p: any) =>
        [p.reference, p.provider, p.msisdn ?? "", p.amount_ssp, p.status, p.receipt_number ?? "", p.created_at].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `souk-junub-finance-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Finance"
      description="Revenue, reconciliation and postpaid invoicing — reported entirely in SSP."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Today" value={formatSSP(t?.today ?? 0)} />
        <Stat label="This week" value={formatSSP(t?.week ?? 0)} />
        <Stat label="This month" value={formatSSP(t?.month ?? 0)} />
        <Stat label="This year" value={formatSSP(t?.year ?? 0)} />
        <Stat
          label="Outstanding"
          value={formatSSP(t?.outstanding ?? 0)}
          hint="unpaid postpaid invoices"
        />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <Label>From</Label>
            <Input type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Period collected</p>
            <p className="font-mono text-lg text-primary">{formatSSP(t?.total ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">
              {t?.count ?? 0} settled · {t?.failed ?? 0} failed
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Postpaid invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="grid gap-4 pt-4 lg:grid-cols-3">
          <Breakdown title="Payment method" rows={data?.byProvider ?? []} />
          <Breakdown title="Best-selling packages" rows={data?.byPackage ?? []} />
          <Breakdown title="Revenue per router" rows={data?.byRouter ?? []} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-2 pt-4">
          {(data?.payments ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No transactions in this period.
              </CardContent>
            </Card>
          ) : (
            (data?.payments ?? []).slice(0, 200).map((p: any) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{p.reference}</p>
                      <Badge variant={p.status === "success" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                      <Badge variant="outline">{p.provider}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.msisdn ?? "no number"} · {p.hotspot_packages?.name ?? "—"} ·{" "}
                      {relativeTime(p.created_at)}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-primary">{formatSSP(Number(p.amount_ssp))}</span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-2 pt-4">
          <div className="flex justify-end">
            <Button size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
              <FileText className="mr-1.5 h-4 w-4" />
              {run.isPending ? "Generating…" : "Generate this month's invoices"}
            </Button>
          </div>
          {(data?.invoices ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No outstanding invoices.
              </CardContent>
            </Card>
          ) : (
            (data?.invoices ?? []).map((i: any) => (
              <Card key={i.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-sm">{i.invoice_number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {i.pppoe_subscribers?.full_name ?? i.pppoe_subscribers?.username ?? "subscriber"} ·{" "}
                      {i.pppoe_subscribers?.phone ?? "no phone"} · due {relativeTime(i.due_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={i.status === "overdue" ? "destructive" : "secondary"}>{i.status}</Badge>
                    <span className="font-mono text-sm text-primary">
                      {formatSSP(Number(i.amount_ssp) + Number(i.static_ip_fee_ssp ?? 0))}
                    </span>
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
