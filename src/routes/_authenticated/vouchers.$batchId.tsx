import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getBatchVouchers } from "@/lib/hotspot.functions";
import { formatSSP } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vouchers/$batchId")({
  head: () => ({
    meta: [
      { title: "Voucher batch | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Review, export and print a SOUK JUNUB voucher batch with QR login codes, usage progress and redemption state.",
      },
      { property: "og:title", content: "Voucher batch | SOUK JUNUB" },
      { property: "og:description", content: "Printable branded hotspot vouchers with QR codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BatchPage,
});

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  unused: "outline",
  active: "default",
  used: "secondary",
  expired: "destructive",
};

function BatchPage() {
  const { batchId } = Route.useParams();
  const load = useServerFn(getBatchVouchers);
  const { data } = useQuery({ queryKey: ["batch", batchId], queryFn: () => load({ data: { batchId } }) });
  const [filter, setFilter] = useState("all");

  const batch: any = data?.batch;
  const vouchers: any[] = data?.vouchers ?? [];
  const pkg = batch?.hotspot_packages;

  const visible = useMemo(
    () => (filter === "all" ? vouchers : vouchers.filter((v) => v.state === filter)),
    [vouchers, filter],
  );

  const exportCsv = () => {
    const header = "code,state,price_ssp,data_used_mb,minutes_used,expires_at\n";
    const body = vouchers
      .map((v) =>
        [v.code, v.state, v.price_ssp, v.data_used_mb, v.minutes_used, v.expires_at ?? ""].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch?.name ?? "vouchers"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title={batch?.name ?? "Voucher batch"}
      description={
        pkg ? `${pkg.name} · ${formatSSP(Number(pkg.price_ssp))} per voucher` : "Loading batch…"
      }
      actions={
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/vouchers">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print A4
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {["all", "unused", "active", "used", "expired"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s} ({s === "all" ? vouchers.length : vouchers.filter((v) => v.state === s).length})
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
        {visible.map((v) => {
          const cap = Number(pkg?.data_cap_mb ?? 0);
          const pct = cap > 0 ? Math.min(100, (Number(v.data_used_mb) / cap) * 100) : 0;
          return (
            <Card key={v.id} className="break-inside-avoid border-dashed print:shadow-none">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                      SOUK JUNUB WIFI
                    </p>
                    <p className="text-sm font-semibold">{pkg?.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSSP(Number(v.price_ssp))}</p>
                  </div>
                  <QRCodeSVG value={v.code} size={54} bgColor="transparent" fgColor="currentColor" />
                </div>
                <p className="rounded bg-muted px-2 py-1 text-center font-mono text-sm tracking-widest">
                  {v.code}
                </p>
                {cap > 0 ? (
                  <div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {Number(v.data_used_mb).toFixed(0)} / {cap} MB used
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <Badge variant={STATE_VARIANT[v.state] ?? "outline"} className="text-[10px]">
                    {v.state}
                  </Badge>
                  <span>
                    {v.expires_at ? `Exp ${new Date(v.expires_at).toLocaleDateString()}` : "No expiry"}
                  </span>
                </div>
                <p className="text-[9px] leading-tight text-muted-foreground">
                  {batch?.notes ?? "Connect to Souk Junub WiFi and enter this code. Non-refundable."}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
