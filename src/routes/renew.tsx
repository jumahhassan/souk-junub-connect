/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Radio, ShieldCheck, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatSSP } from "@/lib/format";
import { lookupPppoeAccount, renewPppoeAccount } from "@/lib/pppoe-public.functions";

const PROVIDERS = [
  { id: "mtn_momo", label: "MTN Mobile Money" },
  { id: "zain_cash", label: "Zain Cash" },
  { id: "nips", label: "NIPS" },
  { id: "tola", label: "Tola Mobile" },
] as const;

export const Route = createFileRoute("/renew")({
  head: () => ({
    meta: [
      { title: "Renew your internet | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Check your SOUK JUNUB home or business internet status and renew instantly with MTN Mobile Money, Zain Cash, NIPS or Tola — no agent visit needed.",
      },
      { property: "og:title", content: "Renew your internet | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Self-service PPPoE renewal in SSP with mobile money across South Sudan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RenewPage,
});

function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / 86400_000);
}

function RenewPage() {
  const lookup = useServerFn(lookupPppoeAccount);
  const renew = useServerFn(renewPppoeAccount);

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [cycles, setCycles] = useState(1);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["id"]>("mtn_momo");
  const [autoRenew, setAutoRenew] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [receipt, setReceipt] = useState<{ number: string; amount: number; expires: string } | null>(
    null,
  );

  const check = useMutation({
    mutationFn: () => lookup({ data: { username: username.trim(), phone: phone.trim() } }),
    onSuccess: (res: any) => {
      if (!res.ok) {
        setAccount(null);
        toast.error(res.message);
        return;
      }
      setAccount(res.subscriber);
      setAutoRenew(Boolean(res.subscriber.autoRenew));
      setReceipt(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not check that account"),
  });

  const pay = useMutation({
    mutationFn: () =>
      renew({
        data: {
          username: username.trim(),
          phone: phone.trim(),
          cycles,
          provider,
          autoRenew,
        },
      }),
    onSuccess: (res: any) => {
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setAccount(res.subscriber);
      setReceipt({ number: res.receipt, amount: res.amount, expires: res.expiresAt });
      toast.success("Payment confirmed — your connection is renewed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Renewal failed"),
  });

  const remaining = account ? daysLeft(account.expiresAt) : null;
  const total = account?.plan ? account.plan.priceSsp * cycles : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Radio className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold tracking-wide">SOUK JUNUB</span>
          </Link>
          <Link to="/wifi" className="text-xs text-muted-foreground hover:text-foreground">
            WiFi hotspot login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Renew your internet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your account status and pay with mobile money. Your line is reactivated
          immediately — no need to call an agent.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Find my account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>PPPoE username</Label>
              <Input
                value={username}
                placeholder="john.juba"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Registered phone</Label>
              <Input
                value={phone}
                placeholder="0921234567"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                className="w-full"
                onClick={() => check.mutate()}
                disabled={check.isPending || !username.trim() || !phone.trim()}
              >
                {check.isPending ? "Checking…" : "Check status"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {account && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                {account.fullName ?? account.username}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {account.username}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-md border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium">{account.plan?.name ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Speed</p>
                  <p className="font-medium">
                    {account.plan
                      ? `${Math.round(account.plan.downloadKbps / 1024)}M / ${Math.round(
                          account.plan.uploadKbps / 1024,
                        )}M`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {account.expiresAt
                      ? `${new Date(account.expiresAt).toLocaleDateString()}${
                          remaining !== null ? ` (${remaining}d)` : ""
                        }`
                      : "—"}
                  </p>
                </div>
              </div>

              {receipt ? (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Payment received
                  </p>
                  <p className="mt-2 text-sm">
                    Receipt <span className="font-mono">{receipt.number}</span> ·{" "}
                    {formatSSP(receipt.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Active until {new Date(receipt.expires).toLocaleDateString()}. A confirmation
                    SMS has been sent to {phone}.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Renew for</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={cycles}
                        onChange={(e) => setCycles(Number(e.target.value))}
                      >
                        {[1, 2, 3, 6, 12].map((c) => (
                          <option key={c} value={c}>
                            {c} × {account.plan?.billingCycle ?? "month"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pay with</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as any)}
                      >
                        {PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Auto-renew every cycle</p>
                      <p className="text-xs text-muted-foreground">
                        We charge your mobile money wallet automatically before expiry.
                      </p>
                    </div>
                    <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                  </div>

                  <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
                    <span className="text-sm text-muted-foreground">Total to pay</span>
                    <span className="text-xl font-bold text-primary">{formatSSP(total)}</span>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => pay.mutate()}
                    disabled={pay.isPending}
                  >
                    {pay.isPending ? "Processing payment…" : `Pay ${formatSSP(total)}`}
                  </Button>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Payments are confirmed with your mobile money provider before your line is
                    reactivated.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi className="h-4 w-4" />
          SOUK JUNUB — internet billing for South Sudan, priced in SSP.
        </div>
      </main>
    </div>
  );
}
