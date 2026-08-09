import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getHotspotUsers, getPackages, runUserAction } from "@/lib/hotspot.functions";
import { formatBytes, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/hotspot-users")({
  head: () => ({
    meta: [
      { title: "Hotspot users | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Manage hotspot subscribers: live sessions, package changes, bulk extensions, suspensions and one-click disconnects across every router.",
      },
      { property: "og:title", content: "Hotspot users | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Subscriber and live session management for the Souk Junub hotspot network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HotspotUsersPage,
});

const FILTERS = ["all", "active", "expired", "online", "offline", "suspended"] as const;

function HotspotUsersPage() {
  const qc = useQueryClient();
  const load = useServerFn(getHotspotUsers);
  const listPackages = useServerFn(getPackages);
  const act = useServerFn(runUserAction);

  const { data } = useQuery({
    queryKey: ["hotspot-users"],
    queryFn: () => load(),
    refetchInterval: 15_000,
  });
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => listPackages() });

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [days, setDays] = useState(7);
  const [packageId, setPackageId] = useState("");

  const users: any[] = data?.users ?? [];
  const sessions: any[] = data?.sessions ?? [];

  const visible = useMemo(
    () =>
      users.filter((u) => {
        const matchesSearch =
          !search ||
          [u.username, u.phone, u.mac_address, u.full_name]
            .filter(Boolean)
            .some((v: string) => v.toLowerCase().includes(search.toLowerCase()));
        if (!matchesSearch) return false;
        if (filter === "all") return true;
        if (filter === "online") return u.is_online;
        if (filter === "offline") return !u.is_online;
        return u.status === filter;
      }),
    [users, filter, search],
  );

  const mutation = useMutation({
    mutationFn: (payload: any) => act({ data: payload }),
    onSuccess: (r: any) => {
      toast.success(`Applied to ${r.affected} user(s).`);
      setSelected([]);
      void qc.invalidateQueries({ queryKey: ["hotspot-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const header = "username,phone,package,status,mac,ip,expires_at,data_used_mb\n";
    const body = visible
      .map((u) =>
        [
          u.username,
          u.phone ?? "",
          u.hotspot_packages?.name ?? "",
          u.status,
          u.mac_address ?? "",
          u.ip_address ?? "",
          u.expires_at ?? "",
          u.data_used_mb,
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "hotspot-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Hotspot users"
      description="Subscribers roam across every Souk Junub router with the same credentials."
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Subscribers ({users.length})</TabsTrigger>
          <TabsTrigger value="live">Live sessions ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
            <Input
              className="ml-auto w-full sm:w-64"
              placeholder="Search username, phone or MAC"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selected.length > 0 ? (
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 py-3">
                <p className="text-sm font-medium">{selected.length} selected</p>
                <div>
                  <Label className="text-xs">Extend days</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => mutation.mutate({ userIds: selected, action: "extend", days })}
                >
                  Extend
                </Button>
                <div className="min-w-44">
                  <Label className="text-xs">Change package</Label>
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Package" />
                    </SelectTrigger>
                    <SelectContent>
                      {(packages ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!packageId}
                  onClick={() =>
                    mutation.mutate({ userIds: selected, action: "change_package", packageId })
                  }
                >
                  Apply package
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutation.mutate({ userIds: selected, action: "suspend" })}
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutation.mutate({ userIds: selected, action: "unsuspend" })}
                >
                  Unsuspend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => mutation.mutate({ userIds: selected, action: "disconnect" })}
                >
                  <PowerOff className="mr-1.5 h-4 w-4" />
                  Disconnect
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {visible.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No hotspot users match this filter. Users appear here once vouchers are redeemed on a
                router.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map((u) => (
                <Card key={u.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 py-3">
                    <Checkbox
                      checked={selected.includes(u.id)}
                      onCheckedChange={(v) =>
                        setSelected((s) => (v ? [...s, u.id] : s.filter((x) => x !== u.id)))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{u.username}</p>
                        <Badge variant={u.is_online ? "default" : "outline"}>
                          {u.is_online ? "online" : "offline"}
                        </Badge>
                        <Badge variant={u.status === "active" ? "secondary" : "destructive"}>
                          {u.status}
                        </Badge>
                        {u.hotspot_packages?.name ? (
                          <Badge variant="outline">{u.hotspot_packages.name}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {u.phone ?? "no phone"} · {u.mac_address ?? "no MAC"} · {u.ip_address ?? "—"} ·{" "}
                        {Number(u.data_used_mb).toFixed(0)} MB used ·{" "}
                        {u.expires_at
                          ? `expires ${new Date(u.expires_at).toLocaleString()}`
                          : "no expiry"}{" "}
                        · {u.routers?.name ?? "unassigned"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="live" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No active sessions right now.
                </p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-sm">{s.username ?? s.mac_address}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.routers?.name ?? "unknown router"} · started {relativeTime(s.started_at)} ·{" "}
                        {formatBytes(Number(s.rx_bytes) + Number(s.tx_bytes))}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>↓ {(s.rx_rate_kbps / 1024).toFixed(1)} Mbps</p>
                      <p>↑ {(s.tx_rate_kbps / 1024).toFixed(1)} Mbps</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
