/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getCustomerProfile, sendMessage } from "@/lib/crm.functions";
import { formatBytes, formatSSP, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer profile | SOUK JUNUB CRM" },
      {
        name: "description",
        content:
          "Full Souk Junub customer history: payments in SSP, packages purchased, data usage, connection logs, support tickets and message history.",
      },
      { property: "og:title", content: "Customer profile | SOUK JUNUB CRM" },
      {
        property: "og:description",
        content: "Complete billing, usage and support history for a Souk Junub internet customer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getCustomerProfile);
  const send = useServerFn(sendMessage);

  const { data } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => load({ data: { customerId } }),
  });

  const [channel, setChannel] = useState<"sms" | "whatsapp" | "email">("sms");
  const [body, setBody] = useState("");

  const messageMutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          customerId,
          channel,
          to: channel === "email" ? (c?.email ?? "") : (c?.phone ?? ""),
          body,
        },
      }),
    onSuccess: (r: any) => {
      toast[r.status === "sent" ? "success" : "info"](
        r.status === "sent" ? "Message sent." : `Message ${r.status}: ${r.error ?? ""}`,
      );
      setBody("");
      void qc.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c: any = data?.customer;
  const hs: any = c?.hotspot_users;
  const pp: any = c?.pppoe_subscribers;

  return (
    <AppShell
      title={c?.full_name ?? "Customer"}
      description={`${c?.customer_type?.replace("_", " ") ?? ""} · ${c?.phone ?? "no phone"} · ${c?.area ?? "no area"}`}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link to="/customers">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All customers
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Status", c?.status ?? "—"],
          [
            "Plan",
            pp?.pppoe_plans?.name ?? hs?.hotspot_packages?.name ?? (hs ? "hotspot" : "—"),
          ],
          [
            "Expires",
            pp?.expires_at || hs?.expires_at
              ? new Date(pp?.expires_at ?? hs?.expires_at).toLocaleDateString("en-GB")
              : "—",
          ],
          [
            "Lifetime paid",
            formatSSP(
              (data?.payments ?? [])
                .filter((p: any) => p.status === "success")
                .reduce((s: number, p: any) => s + Number(p.amount_ssp), 0),
            ),
          ],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 truncate text-lg font-semibold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <Tabs defaultValue="payments">
              <TabsList className="flex-wrap">
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="packages">Packages</TabsTrigger>
                <TabsTrigger value="usage">Data usage</TabsTrigger>
                <TabsTrigger value="logs">Connection logs</TabsTrigger>
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>

              <TabsContent value="payments" className="space-y-2 pt-4">
                {(data?.payments ?? []).length === 0 ? (
                  <Empty text="No payments recorded for this customer yet." />
                ) : (
                  (data?.payments ?? []).map((p: any) => (
                    <Row
                      key={p.id}
                      title={`${formatSSP(Number(p.amount_ssp))} · ${p.provider.replace("_", " ")}`}
                      subtitle={`${p.reference} · ${new Date(p.created_at).toLocaleString()} · ${p.hotspot_packages?.name ?? "—"}`}
                      badge={p.status}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="packages" className="space-y-2 pt-4">
                {(data?.invoices ?? []).map((i: any) => (
                  <Row
                    key={i.id}
                    title={`${i.invoice_number} · ${i.pppoe_plans?.name ?? "plan"}`}
                    subtitle={`${formatSSP(Number(i.amount_ssp))} · ${new Date(i.period_start).toLocaleDateString("en-GB")} → ${new Date(i.period_end).toLocaleDateString("en-GB")}`}
                    badge={i.status}
                  />
                ))}
                {(data?.vouchers ?? []).map((v: any) => (
                  <Row
                    key={v.id}
                    title={`${v.code} · ${v.hotspot_packages?.name ?? "voucher"}`}
                    subtitle={`${formatSSP(Number(v.price_ssp))} · ${new Date(v.created_at).toLocaleDateString("en-GB")}`}
                    badge={v.state}
                  />
                ))}
                {(data?.invoices ?? []).length + (data?.vouchers ?? []).length === 0 ? (
                  <Empty text="No packages or vouchers purchased yet." />
                ) : null}
              </TabsContent>

              <TabsContent value="usage" className="space-y-2 pt-4">
                <Row
                  title={`Hotspot data used: ${Number(hs?.data_used_mb ?? 0).toFixed(0)} MB`}
                  subtitle={`Minutes used: ${hs?.minutes_used ?? 0} · online: ${hs?.is_online ? "yes" : "no"}`}
                />
                {(data?.pppoeSessions ?? []).slice(0, 10).map((s: any) => (
                  <Row
                    key={s.id}
                    title={`${formatBytes(Number(s.rx_bytes) + Number(s.tx_bytes))} on ${s.routers?.name ?? "router"}`}
                    subtitle={`PPPoE · ${relativeTime(s.started_at)}`}
                  />
                ))}
                {(data?.hotspotSessions ?? []).slice(0, 10).map((s: any) => (
                  <Row
                    key={s.id}
                    title={`${formatBytes(Number(s.rx_bytes) + Number(s.tx_bytes))} on ${s.routers?.name ?? "router"}`}
                    subtitle={`Hotspot · ${relativeTime(s.started_at)}`}
                  />
                ))}
              </TabsContent>

              <TabsContent value="logs" className="space-y-2 pt-4">
                {[...(data?.pppoeSessions ?? []), ...(data?.hotspotSessions ?? [])].length === 0 ? (
                  <Empty text="No connection logs recorded yet." />
                ) : (
                  [...(data?.pppoeSessions ?? []), ...(data?.hotspotSessions ?? [])].map((s: any) => (
                    <Row
                      key={s.id}
                      title={`${s.username ?? s.mac_address ?? "session"} · ${s.ip_address ?? "no IP"}`}
                      subtitle={`${s.routers?.name ?? "router"} · started ${relativeTime(s.started_at)}${s.ended_at ? ` · ended ${relativeTime(s.ended_at)}` : ""}`}
                      badge={s.is_active ? "active" : "closed"}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="tickets" className="space-y-2 pt-4">
                {(data?.tickets ?? []).length === 0 ? (
                  <Empty text="No support tickets for this customer." />
                ) : (
                  (data?.tickets ?? []).map((t: any) => (
                    <Row
                      key={t.id}
                      title={`${t.ticket_number} · ${t.subject}`}
                      subtitle={`${t.category} · ${t.priority} · opened ${relativeTime(t.created_at)}`}
                      badge={t.status}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="messages" className="space-y-2 pt-4">
                {(data?.messages ?? []).length === 0 ? (
                  <Empty text="No messages sent to this customer yet." />
                ) : (
                  (data?.messages ?? []).map((m: any) => (
                    <Row
                      key={m.id}
                      title={m.body}
                      subtitle={`${m.channel} · ${m.to_address} · ${relativeTime(m.created_at)}${m.error ? ` · ${m.error}` : ""}`}
                      badge={m.status}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Phone: {c?.phone ?? "—"}</p>
              <p>Email: {c?.email ?? "—"}</p>
              <p>National ID: {c?.national_id ?? "—"}</p>
              <p>Address: {c?.address ?? "—"}</p>
              <p>Area: {c?.area ?? "—"}</p>
              <p>Router: {c?.routers?.name ?? "unassigned"}</p>
              <p>Site: {c?.sites?.name ?? "—"}</p>
              {c?.notes ? <p className="pt-2 text-foreground">{c.notes}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Send a message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                rows={4}
                placeholder="Type your message…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <Button
                className="w-full"
                size="sm"
                disabled={!body.trim() || messageMutation.isPending}
                onClick={() => messageMutation.mutate()}
              >
                <Send className="mr-1.5 h-4 w-4" />
                Send
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {badge ? <Badge variant="outline">{badge}</Badge> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
