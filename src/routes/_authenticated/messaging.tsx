/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BellRing, Megaphone, Send } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getMessagingConfig,
  runCampaign,
  runExpiryReminders,
  saveProvider,
  saveTemplate,
} from "@/lib/crm.functions";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/messaging")({
  head: () => ({
    meta: [
      { title: "Messaging & notifications | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Configure South Sudan SMS gateways, WhatsApp Business and email, edit notification templates and run scheduled bulk campaigns for Souk Junub customers.",
      },
      { property: "og:title", content: "Messaging & notifications | SOUK JUNUB" },
      {
        property: "og:description",
        content: "SMS, WhatsApp and email automation for Souk Junub subscribers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagingPage,
});

function MessagingPage() {
  const qc = useQueryClient();
  const load = useServerFn(getMessagingConfig);
  const persistProvider = useServerFn(saveProvider);
  const persistTemplate = useServerFn(saveTemplate);
  const campaign = useServerFn(runCampaign);
  const reminders = useServerFn(runExpiryReminders);

  const { data } = useQuery({ queryKey: ["messaging"], queryFn: () => load() });

  const [c, setC] = useState({
    name: "",
    channel: "sms",
    body: "Hi {{name}}, ",
    status: "all",
    customerType: "all",
    scheduledFor: "",
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["messaging"] });

  const providerMutation = useMutation({
    mutationFn: (payload: any) => persistProvider({ data: payload }),
    onSuccess: () => {
      toast.success("Gateway updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateMutation = useMutation({
    mutationFn: (payload: any) => persistTemplate({ data: payload }),
    onSuccess: () => {
      toast.success("Template saved.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaignMutation = useMutation({
    mutationFn: () =>
      campaign({
        data: {
          name: c.name,
          channel: c.channel as any,
          body: c.body,
          audience: { status: c.status, customerType: c.customerType },
          scheduledFor: c.scheduledFor || null,
        },
      }),
    onSuccess: (r: any) => {
      toast.success(
        r.scheduled
          ? `Scheduled for ${r.recipients} recipient(s).`
          : `${r.sent} sent, ${r.failed} failed of ${r.recipients}.`,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reminderMutation = useMutation({
    mutationFn: () => reminders({}),
    onSuccess: (r: any) => {
      toast.success(`${r.queued} expiry reminder(s) processed.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Messaging & notifications"
      description="SMS gateways, WhatsApp Business, email templates and bulk campaigns for Souk Junub customers."
      actions={
        <Button size="sm" variant="outline" onClick={() => reminderMutation.mutate()}>
          <BellRing className="mr-1.5 h-4 w-4" />
          Run expiry reminders
        </Button>
      }
    >
      <Tabs defaultValue="gateways">
        <TabsList className="flex-wrap">
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="space-y-2 pt-4">
          {(data?.providers ?? []).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{p.label}</p>
                    <Badge variant="outline">{p.channel}</Badge>
                    <Badge variant={p.secret_present ? "secondary" : "destructive"}>
                      {p.secret_present ? "API key set" : `needs ${p.secret_name ?? "key"}`}
                    </Badge>
                    {p.is_default ? <Badge>default</Badge> : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Sender ID</Label>
                      <Input
                        defaultValue={p.sender_id ?? ""}
                        onBlur={(e) =>
                          providerMutation.mutate({
                            id: p.id,
                            channel: p.channel,
                            provider: p.provider,
                            label: p.label,
                            sender_id: e.target.value || null,
                            base_url: p.base_url,
                            is_default: p.is_default,
                            is_active: p.is_active,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Endpoint</Label>
                      <Input
                        defaultValue={p.base_url ?? ""}
                        onBlur={(e) =>
                          providerMutation.mutate({
                            id: p.id,
                            channel: p.channel,
                            provider: p.provider,
                            label: p.label,
                            sender_id: p.sender_id,
                            base_url: e.target.value || null,
                            is_default: p.is_default,
                            is_active: p.is_active,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:flex-col md:items-end md:justify-center">
                  <label className="flex items-center gap-2 text-xs">
                    Active
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) =>
                        providerMutation.mutate({
                          id: p.id,
                          channel: p.channel,
                          provider: p.provider,
                          label: p.label,
                          sender_id: p.sender_id,
                          base_url: p.base_url,
                          is_default: p.is_default,
                          is_active: v,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    Default
                    <Switch
                      checked={p.is_default}
                      onCheckedChange={(v) =>
                        providerMutation.mutate({
                          id: p.id,
                          channel: p.channel,
                          provider: p.provider,
                          label: p.label,
                          sender_id: p.sender_id,
                          base_url: p.base_url,
                          is_default: v,
                          is_active: p.is_active,
                        })
                      }
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            Each gateway needs its API key stored securely before messages can leave the outbox. Tell
            me which provider you signed up with and I will request the key.
          </p>
        </TabsContent>

        <TabsContent value="templates" className="space-y-2 pt-4">
          {(data?.templates ?? []).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <Badge variant="outline">{t.channel}</Badge>
                  <code className="text-xs text-muted-foreground">{t.key}</code>
                  <label className="ml-auto flex items-center gap-2 text-xs">
                    Active
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) =>
                        templateMutation.mutate({
                          id: t.id,
                          key: t.key,
                          name: t.name,
                          channel: t.channel,
                          body: t.body,
                          is_active: v,
                        })
                      }
                    />
                  </label>
                </div>
                <Textarea
                  rows={3}
                  defaultValue={t.body}
                  onBlur={(e) =>
                    e.target.value !== t.body &&
                    templateMutation.mutate({
                      id: t.id,
                      key: t.key,
                      name: t.name,
                      channel: t.channel,
                      body: e.target.value,
                      is_active: t.is_active,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{name}} {{package}} {{amount}} {{expiry}} {{reference}} {{code}} {{ticket}}"}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                New bulk campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Campaign name</Label>
                <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={c.channel} onValueChange={(v) => setC({ ...c, channel: v })}>
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
              <div>
                <Label>Audience status</Label>
                <Select value={c.status} onValueChange={(v) => setC({ ...c, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "active", "expired", "paused", "suspended"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer type</Label>
                <Select value={c.customerType} onValueChange={(v) => setC({ ...c, customerType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "hotspot", "pppoe", "static_ip", "voucher_only"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Message</Label>
                <Textarea
                  rows={3}
                  value={c.body}
                  onChange={(e) => setC({ ...c, body: e.target.value })}
                />
              </div>
              <div>
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={c.scheduledFor}
                  onChange={(e) => setC({ ...c, scheduledFor: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={c.name.trim().length < 2 || campaignMutation.isPending}
                  onClick={() => campaignMutation.mutate()}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {c.scheduledFor ? "Schedule campaign" : "Send now"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {(data?.campaigns ?? []).map((cp: any) => (
            <Card key={cp.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold">{cp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cp.channel} · {cp.total_recipients} recipients · {cp.sent_count} sent ·{" "}
                    {cp.failed_count} failed · {relativeTime(cp.created_at)}
                  </p>
                </div>
                <Badge variant="outline">{cp.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outbox" className="space-y-2 pt-4">
          {(data?.log ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No messages yet.
              </CardContent>
            </Card>
          ) : (
            (data?.log ?? []).map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{m.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.channel} · {m.to_address} · {m.customers?.full_name ?? "—"} ·{" "}
                      {relativeTime(m.created_at)}
                      {m.error ? ` · ${m.error}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === "sent"
                        ? "secondary"
                        : m.status === "failed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {m.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
