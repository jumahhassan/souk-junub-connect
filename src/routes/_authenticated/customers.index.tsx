/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowUpDown, Download, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getCustomers, importCustomers, saveCustomer } from "@/lib/crm.functions";
import { getRouters } from "@/lib/network.functions";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers | SOUK JUNUB CRM" },
      {
        name: "description",
        content:
          "Souk Junub customer database: hotspot users, PPPoE subscribers and static IP clients with phone, National ID, area and full billing history.",
      },
      { property: "og:title", content: "Customers | SOUK JUNUB CRM" },
      {
        property: "og:description",
        content: "Search, filter and manage every Souk Junub internet customer in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

const TYPES = [
  { value: "hotspot", label: "Hotspot user" },
  { value: "pppoe", label: "PPPoE subscriber" },
  { value: "static_ip", label: "Static IP client" },
  { value: "voucher_only", label: "Voucher only" },
];
const STATUSES = ["active", "expired", "paused", "suspended"];
const SORTS = [
  { value: "created_at", label: "Newest" },
  { value: "full_name", label: "Name" },
  { value: "area", label: "Area" },
  { value: "status", label: "Status" },
];

const EMPTY = {
  full_name: "",
  phone: "",
  email: "",
  national_id: "",
  address: "",
  area: "",
  customer_type: "hotspot",
  status: "active",
  router_id: "",
  notes: "",
};

function CustomersPage() {
  const qc = useQueryClient();
  const load = useServerFn(getCustomers);
  const listRouters = useServerFn(getRouters);
  const save = useServerFn(saveCustomer);
  const importAll = useServerFn(importCustomers);

  const { data } = useQuery({ queryKey: ["customers"], queryFn: () => load() });
  const { data: routers } = useQuery({ queryKey: ["routers"], queryFn: () => listRouters() });

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("created_at");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);

  const customers: any[] = data?.customers ?? [];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = customers.filter((c) => {
      if (type !== "all" && c.customer_type !== type) return false;
      if (status !== "all" && c.status !== status) return false;
      if (!term) return true;
      return [
        c.full_name,
        c.phone,
        c.national_id,
        c.email,
        c.area,
        c.hotspot_users?.username,
        c.pppoe_subscribers?.username,
      ]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term));
    });
    return rows.sort((a, b) => {
      const av = String(a[sort] ?? "");
      const bv = String(b[sort] ?? "");
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [customers, search, type, status, sort, asc]);

  const mutation = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      toast.success("Customer saved.");
      setOpen(false);
      setForm(EMPTY);
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: () => importAll({}),
    onSuccess: (r: any) => {
      toast.success(`${r.imported} customer record(s) imported from the network.`);
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const header = "name,phone,email,national_id,type,status,area,address,username\n";
    const body = visible
      .map((c) =>
        [
          c.full_name,
          c.phone ?? "",
          c.email ?? "",
          c.national_id ?? "",
          c.customer_type,
          c.status,
          c.area ?? "",
          (c.address ?? "").replace(/,/g, " "),
          c.hotspot_users?.username ?? c.pppoe_subscribers?.username ?? "",
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "souk-junub-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = data?.stats;

  return (
    <AppShell
      title="Customers"
      description="Every Souk Junub subscriber — hotspot, PPPoE, static IP and voucher-only — in one searchable database."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Sync from network
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-1.5 h-4 w-4" />
                New customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit customer" : "New customer"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Full name</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone (+211)</Label>
                  <Input
                    placeholder="0921234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>National ID</Label>
                  <Input
                    value={form.national_id}
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Area / location</Label>
                  <Input
                    placeholder="Juba, Munuki"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Customer type</Label>
                  <Select
                    value={form.customer_type}
                    onValueChange={(v) => setForm({ ...form, customer_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Router assignment</Label>
                  <Select
                    value={form.router_id || "none"}
                    onValueChange={(v) => setForm({ ...form, router_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {((routers as any)?.routers ?? []).map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={mutation.isPending || form.full_name.trim().length < 2}
                  onClick={() =>
                    mutation.mutate({
                      ...(form.id ? { id: form.id } : {}),
                      full_name: form.full_name,
                      phone: form.phone || null,
                      email: form.email || null,
                      national_id: form.national_id || null,
                      address: form.address || null,
                      area: form.area || null,
                      customer_type: form.customer_type,
                      status: form.status,
                      router_id: form.router_id || null,
                      notes: form.notes || null,
                    })
                  }
                >
                  Save customer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Total", stats?.total ?? 0],
          ["Active", stats?.active ?? 0],
          ["Expired", stats?.expired ?? 0],
          ["Paused", stats?.paused ?? 0],
          ["Suspended", stats?.suspended ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          className="w-full sm:w-72"
          placeholder="Search name, phone, username or National ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setAsc((v) => !v)}>
          <ArrowUpDown className="mr-1.5 h-4 w-4" />
          {asc ? "Asc" : "Desc"}
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No customers match this filter. Use “Sync from network” to pull in existing hotspot and
              PPPoE accounts.
            </CardContent>
          </Card>
        ) : (
          visible.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{c.full_name}</p>
                    <Badge variant="outline">{c.customer_type.replace("_", " ")}</Badge>
                    <Badge
                      variant={
                        c.status === "active"
                          ? "secondary"
                          : c.status === "suspended"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.phone ?? "no phone"} · {c.national_id ? `ID ${c.national_id}` : "no ID"} ·{" "}
                    {c.area ?? "no area"} ·{" "}
                    {c.hotspot_users?.username ?? c.pppoe_subscribers?.username ?? "no account"} ·{" "}
                    {c.routers?.name ?? "unassigned router"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({
                        id: c.id,
                        full_name: c.full_name,
                        phone: c.phone ?? "",
                        email: c.email ?? "",
                        national_id: c.national_id ?? "",
                        address: c.address ?? "",
                        area: c.area ?? "",
                        customer_type: c.customer_type,
                        status: c.status,
                        router_id: c.router_id ?? "",
                        notes: c.notes ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                      Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
