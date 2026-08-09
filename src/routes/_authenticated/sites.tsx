import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteSite, getRouters, saveSite } from "@/lib/network.functions";

export const Route = createFileRoute("/_authenticated/sites")({
  head: () => ({
    meta: [
      { title: "Sites | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Manage SOUK JUNUB deployment sites across Juba, Wau, Malakal, Bor and Rumbek and assign routers to each one.",
      },
      { property: "og:title", content: "Sites | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Deployment sites and regional coverage for the SOUK JUNUB network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SitesPage,
});

function SitesPage() {
  const qc = useQueryClient();
  const fetchRouters = useServerFn(getRouters);
  const persist = useServerFn(saveSite);
  const remove = useServerFn(deleteSite);

  const { data } = useQuery({ queryKey: ["routers"], queryFn: () => fetchRouters() });
  const [form, setForm] = useState({ name: "", region: "", city: "", notes: "" });

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          name: form.name.trim(),
          region: form.region.trim() || null,
          city: form.city.trim() || null,
          notes: form.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Site saved.");
      setForm({ name: "", region: "", city: "", notes: "" });
      void qc.invalidateQueries({ queryKey: ["routers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (siteId: string) => remove({ data: { siteId } }),
    onSuccess: () => {
      toast.success("Site removed.");
      void qc.invalidateQueries({ queryKey: ["routers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Sites" description="Physical deployment locations across South Sudan.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registered sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.sites ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sites yet. Add your first location.
              </p>
            ) : (
              (data?.sites ?? []).map((s: any) => {
                const count = (data?.routers ?? []).filter((r: any) => r.site_id === s.id).length;
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[s.city, s.region].filter(Boolean).join(", ") || "Location not set"} ·{" "}
                        {count} router{count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => drop.mutate(s.id)}
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add a site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Juba Konyokonyo"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>State / region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Central Equatoria"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City / town</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Juba"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={500}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || form.name.trim().length < 2}
            >
              {save.isPending ? "Saving…" : "Save site"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
