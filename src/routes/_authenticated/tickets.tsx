/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, LifeBuoy, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addTicketMessage,
  createTicketsFromAlerts,
  getCustomers,
  getTicketThread,
  getTickets,
  saveTicket,
} from "@/lib/crm.functions";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Support tickets | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Souk Junub helpdesk: connection, billing and installation tickets with priority, SLA tracking, technician assignment and customer replies.",
      },
      { property: "og:title", content: "Support tickets | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Track and resolve customer support tickets across the Souk Junub network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TicketsPage,
});

const CATEGORIES = [
  { value: "connection", label: "Connection issue" },
  { value: "billing", label: "Billing" },
  { value: "slow_speed", label: "Slow speed" },
  { value: "installation", label: "New installation" },
  { value: "general", label: "General" },
];
const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const EMPTY = {
  subject: "",
  description: "",
  category: "connection",
  priority: "medium",
  customer_id: "",
  source: "phone",
};

function TicketsPage() {
  const qc = useQueryClient();
  const load = useServerFn(getTickets);
  const loadCustomers = useServerFn(getCustomers);
  const loadThread = useServerFn(getTicketThread);
  const save = useServerFn(saveTicket);
  const reply = useServerFn(addTicketMessage);
  const fromAlerts = useServerFn(createTicketsFromAlerts);

  const { data } = useQuery({ queryKey: ["tickets"], queryFn: () => load(), refetchInterval: 30_000 });
  const { data: customerData } = useQuery({ queryKey: ["customers"], queryFn: () => loadCustomers() });

  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [notify, setNotify] = useState(true);

  const { data: thread } = useQuery({
    queryKey: ["ticket", activeId],
    queryFn: () => loadThread({ data: { ticketId: activeId! } }),
    enabled: Boolean(activeId),
  });

  const tickets: any[] = data?.tickets ?? [];
  const visible = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (statusFilter === "all" || t.status === statusFilter) &&
          (priorityFilter === "all" || t.priority === priorityFilter),
      ),
    [tickets, statusFilter, priorityFilter],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      toast.success("Ticket saved.");
      setOpen(false);
      setForm(EMPTY);
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      if (activeId) void qc.invalidateQueries({ queryKey: ["ticket", activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const replyMutation = useMutation({
    mutationFn: () =>
      reply({
        data: { ticketId: activeId!, body: replyBody, isInternal: internal, notifyCustomer: notify },
      }),
    onSuccess: () => {
      setReplyBody("");
      void qc.invalidateQueries({ queryKey: ["ticket", activeId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alertsMutation = useMutation({
    mutationFn: () => fromAlerts({}),
    onSuccess: (r: any) => {
      toast.success(`${r.created} ticket(s) created from router alerts.`);
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = data?.stats;

  return (
    <AppShell
      title="Support tickets"
      description="Helpdesk for Souk Junub customers, with SLA timers and technician assignment."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => alertsMutation.mutate()}>
            <AlertTriangle className="mr-1.5 h-4 w-4" />
            Create from alerts
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                New ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New support ticket</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={form.customer_id || "none"}
                    onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unlinked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unlinked</SelectItem>
                      {(customerData?.customers ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} {c.phone ? `· ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={form.subject.trim().length < 3 || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      subject: form.subject,
                      description: form.description || null,
                      category: form.category,
                      priority: form.priority,
                      customer_id: form.customer_id || null,
                      source: "phone",
                    })
                  }
                >
                  Create ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Open", stats?.open ?? 0],
          ["In progress", stats?.inProgress ?? 0],
          ["Resolved", stats?.resolved ?? 0],
          ["SLA breached", stats?.breached ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-3">
          {visible.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No tickets match this filter.
              </CardContent>
            </Card>
          ) : (
            visible.map((t) => {
              const breached = t.sla_due_at && !t.resolved_at && new Date(t.sla_due_at) < new Date();
              return (
                <Card
                  key={t.id}
                  className={activeId === t.id ? "border-primary" : undefined}
                  onClick={() => setActiveId(t.id)}
                >
                  <CardContent className="cursor-pointer py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.ticket_number}
                      </span>
                      <p className="text-sm font-semibold">{t.subject}</p>
                      <Badge variant={t.priority === "critical" ? "destructive" : "outline"}>
                        {t.priority}
                      </Badge>
                      <Badge variant={t.status === "resolved" ? "secondary" : "outline"}>
                        {t.status.replace("_", " ")}
                      </Badge>
                      {breached ? <Badge variant="destructive">SLA breached</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.customers?.full_name ?? "unlinked"} · {t.category.replace("_", " ")} ·{" "}
                      {t.source.replace("_", " ")} · opened {relativeTime(t.created_at)}
                      {t.sla_due_at ? ` · SLA ${new Date(t.sla_due_at).toLocaleString()}` : ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="h-4 w-4" />
              {thread?.ticket ? thread.ticket.ticket_number : "Select a ticket"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!thread?.ticket ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Pick a ticket to read the conversation and reply.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">{thread.ticket.subject}</p>
                <p className="text-xs text-muted-foreground">{thread.ticket.description}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={thread.ticket.status}
                    onValueChange={(v) =>
                      saveMutation.mutate({
                        id: thread.ticket.id,
                        subject: thread.ticket.subject,
                        category: thread.ticket.category,
                        priority: thread.ticket.priority,
                        status: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={thread.ticket.assigned_to ?? "none"}
                    onValueChange={(v) =>
                      saveMutation.mutate({
                        id: thread.ticket.id,
                        subject: thread.ticket.subject,
                        category: thread.ticket.category,
                        priority: thread.ticket.priority,
                        assigned_to: v === "none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(data?.staff ?? []).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name ?? "Staff"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {(thread.messages ?? []).map((m: any) => (
                    <div
                      key={m.id}
                      className={`rounded-md border px-3 py-2 text-sm ${m.is_internal ? "border-dashed border-muted bg-muted/30" : "border-border"}`}
                    >
                      <p className="text-xs text-muted-foreground">
                        {m.author_name ?? "Agent"} · {relativeTime(m.created_at)}
                        {m.is_internal ? " · internal note" : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                </div>

                <Textarea
                  rows={3}
                  placeholder="Write a reply…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={internal}
                      onCheckedChange={(v) => setInternal(Boolean(v))}
                    />
                    Internal note
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={notify}
                      disabled={internal}
                      onCheckedChange={(v) => setNotify(Boolean(v))}
                    />
                    SMS the customer
                  </label>
                  <Button
                    size="sm"
                    className="ml-auto"
                    disabled={!replyBody.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate()}
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
