/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAnalyticsDashboard } from "@/lib/analytics.functions";
import { formatSSP, relativeTime } from "@/lib/format";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Real-time Analytics | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Live SSP revenue, active users, voucher sales, package popularity, router load and data usage analytics for the SOUK JUNUB ISP network.",
      },
      { property: "og:title", content: "Real-time Analytics | SOUK JUNUB" },
      {
        property: "og:description",
        content: "KPI cards, revenue charts, heavy users and router status for South Sudan operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--secondary))",
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-xl tabular-nums text-primary">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const fetchDashboard = useServerFn(getAnalyticsDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => fetchDashboard(),
    refetchInterval: 15000,
  });

  const k = data?.kpis;
  const maxMb = Math.max(1, ...(data?.topDownloaders ?? []).map((u: any) => u.mb));

  return (
    <AppShell
      title="Real-time analytics"
      description="Live KPIs, revenue trends and usage intelligence — refreshed every 15 seconds."
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadCsv(
              "souk-junub-daily-revenue.csv",
              ["date", "revenue_ssp", "transactions"],
              (data?.dailyRevenue ?? []).map((d: any) => [d.date, d.revenue, d.count]),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Revenue today" value={formatSSP(k?.revenueToday ?? 0)} />
            <Kpi label="Revenue this month" value={formatSSP(k?.revenueMonth ?? 0)} />
            <Kpi label="Active users" value={String(k?.activeUsers ?? 0)} hint="Hotspot + PPPoE" />
            <Kpi label="Expired today" value={String(k?.expiredToday ?? 0)} />
            <Kpi label="Online right now" value={String(k?.onlineNow ?? 0)} />
            <Kpi
              label="Offline but active"
              value={String(k?.offlineButActive ?? 0)}
              hint="Paid, not connected"
            />
            <Kpi
              label="Routers"
              value={`${k?.routersOnline ?? 0} / ${k?.routersTotal ?? 0}`}
              hint="Online / total"
            />
            <Kpi label="Vouchers sold today" value={String(k?.vouchersSoldToday ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Daily revenue (last 30 days, SSP)">
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={54} />
                <Tooltip formatter={(v: any) => formatSSP(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Monthly sales (last 12 months, SSP)">
              <BarChart data={data.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(2)} />
                <YAxis tick={{ fontSize: 10 }} width={54} />
                <Tooltip formatter={(v: any) => formatSSP(Number(v))} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Package popularity">
              <PieChart>
                <Tooltip />
                <Pie
                  data={data.packagePopularity}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  label={(e: any) => e.name}
                >
                  {(data.packagePopularity ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartCard>

            <ChartCard title="Router load distribution (active users)">
              <BarChart data={data.routerLoad}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip />
                <Bar dataKey="users" fill="hsl(var(--info))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Data usage trend (GB / day)">
              <AreaChart data={data.usageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip />
                <Area type="monotone" dataKey="gb" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.25)" />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Peak usage hours (session starts)">
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="sessions" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top downloaders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topDownloaders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No usage recorded yet.</p>
                ) : (
                  data.topDownloaders.map((u: any) => (
                    <div key={u.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">
                          {u.username}
                          {u.name ? (
                            <span className="text-muted-foreground"> · {u.name}</span>
                          ) : null}
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          {(u.mb / 1024).toFixed(2)} GB
                        </span>
                      </div>
                      <Progress value={(u.mb / maxMb) * 100} className="h-1.5" />
                    </div>
                  ))
                )}
                {data.abusive.length > 0 ? (
                  <p className="pt-1 text-xs text-warning">
                    {data.abusive.length} user(s) flagged for abnormally high consumption (&gt;4× the
                    network average).
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Router status grid</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {data.routers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No routers registered.</p>
                ) : (
                  data.routers.map((r: any) => (
                    <div
                      key={r.id}
                      className={`rounded-md border px-3 py-2 ${
                        r.status === "online"
                          ? "border-success/40 bg-success/10"
                          : "border-destructive/40 bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <StatusBadge status={r.status} pulse />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {r.active_users ?? 0} users · seen {relativeTime(r.last_seen_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent transactions (last 20)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Reference</th>
                    <th>Provider</th>
                    <th>Phone</th>
                    <th>Package</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((p: any) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="py-2 font-mono text-xs">{p.reference}</td>
                      <td className="uppercase text-xs">{p.provider}</td>
                      <td className="font-mono text-xs">{p.msisdn ?? "—"}</td>
                      <td className="text-xs">{p.hotspot_packages?.name ?? "—"}</td>
                      <td className="text-right font-mono tabular-nums">
                        {formatSSP(Number(p.amount_ssp ?? 0))}
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {relativeTime(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.recentTransactions.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">No transactions yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
