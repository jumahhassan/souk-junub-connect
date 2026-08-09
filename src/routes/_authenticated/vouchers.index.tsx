import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Ticket, Wand2 } from "lucide-react";
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
import { activateVoucher, createVoucherBatch, getPackages, getVoucherBatches } from "@/lib/hotspot.functions";
import { formatSSP, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vouchers/")({
  head: () => ({
    meta: [
      { title: "Vouchers | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Generate hotspot voucher batches in bulk, track redemption and print branded A4 voucher sheets with QR login codes.",
      },
      { property: "og:title", content: "Vouchers | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Bulk voucher generation and redemption tracking for South Sudan hotspots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VouchersPage,
});

function VouchersPage() {
  const qc = useQueryClient();
  const listBatches = useServerFn(getVoucherBatches);
  const listPackages = useServerFn(getPackages);
  const generate = useServerFn(createVoucherBatch);
  const activate = useServerFn(activateVoucher);

  const { data: batches } = useQuery({ queryKey: ["voucher-batches"], queryFn: () => listBatches() });
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => listPackages() });

  const [form, setForm] = useState({
    name: "",
    packageId: "",
    quantity: 100,
    codeFormat: "grouped" as "grouped" | "alnum",
    codeLength: 12,
    prefix: "",
    expiresAt: "",
  });
  const [code, setCode] = useState("");

  const run = useMutation({
    mutationFn: () =>
      generate({
        data: {
          name: form.name.trim(),
          packageId: form.packageId,
          quantity: Number(form.quantity),
          codeFormat: form.codeFormat,
          codeLength: Number(form.codeLength),
          prefix: form.prefix.trim() || null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
      }),
    onSuccess: (r: any) => {
      toast.success(`${r.created} vouchers generated.`);
      setForm((f) => ({ ...f, name: "" }));
      void qc.invalidateQueries({ queryKey: ["voucher-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeem = useMutation({
    mutationFn: () => activate({ data: { code } }),
    onSuccess: () => {
      toast.success("Voucher activated.");
      setCode("");
      void qc.invalidateQueries({ queryKey: ["voucher-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: any[] = batches ?? [];
  const pkgs: any[] = packages ?? [];

  return (
    <AppShell title="Vouchers" description="Bulk generation, redemption tracking and printable sheets.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No voucher batches yet.
              </CardContent>
            </Card>
          ) : (
            rows.map((b) => {
              const redeemed = b.stats.active + b.stats.used;
              return (
                <Card key={b.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <p className="font-semibold">{b.name}</p>
                        <Badge variant="outline">{b.hotspot_packages?.name}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.quantity} codes · {redeemed} redeemed · {b.stats.unused} unused ·{" "}
                        {formatSSP(Number(b.hotspot_packages?.price_ssp ?? 0) * b.quantity)} face value ·{" "}
                        {relativeTime(b.created_at)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/vouchers/$batchId" params={{ batchId: b.id }}>
                        Open batch
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generate batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Batch name</Label>
                <Input
                  value={form.name}
                  placeholder="Juba market — August"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Package</Label>
                <Select
                  value={form.packageId}
                  onValueChange={(v) => setForm((f) => ({ ...f, packageId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose package" />
                  </SelectTrigger>
                  <SelectContent>
                    {pkgs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatSSP(Number(p.price_ssp))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[100, 500, 1000, 5000].map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant={form.quantity === q ? "default" : "outline"}
                      onClick={() => setForm((f) => ({ ...f, quantity: q }))}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <Input
                  className="mt-2"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Code format</Label>
                  <Select
                    value={form.codeFormat}
                    onValueChange={(v) => setForm((f) => ({ ...f, codeFormat: v as "grouped" | "alnum" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grouped">XXXX-XXXX-XXXX</SelectItem>
                      <SelectItem value="alnum">Alphanumeric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Length</Label>
                  <Input
                    type="number"
                    value={form.codeLength}
                    onChange={(e) => setForm((f) => ({ ...f, codeLength: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prefix</Label>
                  <Input
                    value={form.prefix}
                    placeholder="SJ"
                    onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Expires</Label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.name.trim() || !form.packageId || run.isPending}
                onClick={() => run.mutate()}
              >
                <Wand2 className="mr-1.5 h-4 w-4" />
                {run.isPending ? "Generating…" : "Generate vouchers"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manual activation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={code}
                placeholder="SJ-XXXX-XXXX-XXXX"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={code.length < 4 || redeem.isPending}
                onClick={() => redeem.mutate()}
              >
                Activate voucher
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
