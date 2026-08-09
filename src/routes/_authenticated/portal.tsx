import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
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
import { deleteAd, getPortal, saveAd, savePortal } from "@/lib/hotspot.functions";

export const THEMES: Record<string, { label: string; primary: string; secondary: string; accent: string }> = {
  default: { label: "Default", primary: "#f2b134", secondary: "#0b1a2b", accent: "#16a34a" },
  dark: { label: "Dark", primary: "#e5e7eb", secondary: "#09090b", accent: "#3b82f6" },
  midnight_gold: { label: "Midnight Gold", primary: "#d4af37", secondary: "#0a0f1f", accent: "#f5e6a8" },
  ocean: { label: "Ocean", primary: "#38bdf8", secondary: "#082f49", accent: "#22d3ee" },
  sunset: { label: "Sunset", primary: "#fb7185", secondary: "#3b0764", accent: "#fbbf24" },
  forest: { label: "Forest", primary: "#4ade80", secondary: "#052e16", accent: "#a3e635" },
  neon: { label: "Neon", primary: "#e879f9", secondary: "#0f0524", accent: "#22d3ee" },
  rose: { label: "Rose", primary: "#f43f5e", secondary: "#4c0519", accent: "#fda4af" },
};

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Captive portal designer | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Design the Souk Junub captive portal: themes, branding, login methods, free trial rules, multi-language support and advertisement slots.",
      },
      { property: "og:title", content: "Captive portal designer | SOUK JUNUB" },
      {
        property: "og:description",
        content: "Brand and configure the hotspot login experience for South Sudan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

const LANGS = ["en", "ar", "sw", "din"];

function PortalPage() {
  const qc = useQueryClient();
  const load = useServerFn(getPortal);
  const persist = useServerFn(savePortal);
  const persistAd = useServerFn(saveAd);
  const removeAd = useServerFn(deleteAd);

  const { data } = useQuery({ queryKey: ["portal"], queryFn: () => load() });
  const portal: any = data?.portals?.[0];
  const ads: any[] = data?.ads ?? [];

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (portal && !form) setForm({ ...portal });
  }, [portal, form]);

  const [ad, setAd] = useState({
    title: "",
    kind: "image" as "image" | "video" | "text",
    asset_url: "",
    body_text: "",
    target_url: "",
    starts_at: "",
    ends_at: "",
  });

  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          id: form.id,
          name: form.name,
          theme: form.theme,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color,
          logo_url: form.logo_url || null,
          background_url: form.background_url || null,
          custom_css: form.custom_css || null,
          welcome_title: form.welcome_title,
          welcome_message: form.welcome_message || null,
          terms_text: form.terms_text || null,
          allow_voucher: form.allow_voucher,
          allow_userpass: form.allow_userpass,
          allow_otp: form.allow_otp,
          trial_enabled: form.trial_enabled,
          trial_mode: form.trial_mode,
          trial_minutes: Number(form.trial_minutes),
          trial_data_mb: Number(form.trial_data_mb),
          trial_max_per_device_per_day: Number(form.trial_max_per_device_per_day),
          languages: form.languages,
          default_language: form.default_language,
        },
      }),
    onSuccess: () => {
      toast.success("Portal saved.");
      void qc.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAd = useMutation({
    mutationFn: () =>
      persistAd({
        data: {
          portal_id: portal?.id ?? null,
          title: ad.title.trim(),
          kind: ad.kind,
          asset_url: ad.asset_url || null,
          body_text: ad.body_text || null,
          target_url: ad.target_url || null,
          starts_at: ad.starts_at ? new Date(ad.starts_at).toISOString() : null,
          ends_at: ad.ends_at ? new Date(ad.ends_at).toISOString() : null,
          is_active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Ad slot created.");
      setAd({ title: "", kind: "image", asset_url: "", body_text: "", target_url: "", starts_at: "", ends_at: "" });
      void qc.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dropAd = useMutation({
    mutationFn: (adId: string) => removeAd({ data: { adId } }),
    onSuccess: () => {
      toast.success("Ad removed.");
      void qc.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) {
    return (
      <AppShell title="Captive portal" description="Loading portal configuration…">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Captive portal designer"
      description="Themes, branding, login methods, free trials and advertisement slots."
      actions={
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save portal"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Tabs defaultValue="brand">
          <TabsList>
            <TabsTrigger value="brand">Branding</TabsTrigger>
            <TabsTrigger value="login">Login &amp; trials</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Theme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        set({
                          theme: key,
                          primary_color: t.primary,
                          secondary_color: t.secondary,
                          accent_color: t.accent,
                        })
                      }
                      className={`rounded-md border p-2 text-left text-xs transition ${
                        form.theme === key ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}
                    >
                      <div className="mb-1 flex gap-1">
                        {[t.primary, t.secondary, t.accent].map((c) => (
                          <span key={c} className="h-4 w-4 rounded-sm" style={{ background: c }} />
                        ))}
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["primary_color", "secondary_color", "accent_color"] as const).map((k) => (
                    <div key={k}>
                      <Label className="capitalize">{k.replace("_", " ")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="h-9 w-12 p-1"
                          value={form[k]}
                          onChange={(e) => set({ [k]: e.target.value })}
                        />
                        <Input value={form[k]} onChange={(e) => set({ [k]: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Logo URL</Label>
                    <Input value={form.logo_url ?? ""} onChange={(e) => set({ logo_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Background image URL</Label>
                    <Input
                      value={form.background_url ?? ""}
                      onChange={(e) => set({ background_url: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Welcome title</Label>
                  <Input value={form.welcome_title} onChange={(e) => set({ welcome_title: e.target.value })} />
                </div>
                <div>
                  <Label>Welcome message</Label>
                  <Textarea
                    rows={2}
                    value={form.welcome_message ?? ""}
                    onChange={(e) => set({ welcome_message: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Terms</Label>
                  <Textarea
                    rows={2}
                    value={form.terms_text ?? ""}
                    onChange={(e) => set({ terms_text: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Custom CSS override</Label>
                  <Textarea
                    rows={4}
                    className="font-mono text-xs"
                    value={form.custom_css ?? ""}
                    onChange={(e) => set({ custom_css: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Languages</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {LANGS.map((l) => {
                      const on = form.languages.includes(l);
                      return (
                        <Button
                          key={l}
                          size="sm"
                          variant={on ? "default" : "outline"}
                          onClick={() =>
                            set({
                              languages: on
                                ? form.languages.filter((x: string) => x !== l)
                                : [...form.languages, l],
                            })
                          }
                        >
                          {l.toUpperCase()}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="login" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Login methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["allow_voucher", "Voucher code entry"],
                  ["allow_userpass", "Username &amp; password"],
                  ["allow_otp", "Phone number + OTP"],
                ].map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <p className="text-sm">{label.replace("&amp;", "&")}</p>
                    <Switch checked={form[key]} onCheckedChange={(v) => set({ [key]: v })} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Free trial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <p className="text-sm">Enable free trial</p>
                  <Switch
                    checked={form.trial_enabled}
                    onCheckedChange={(v) => set({ trial_enabled: v })}
                  />
                </div>
                <div>
                  <Label>Trial flow</Label>
                  <Select value={form.trial_mode} onValueChange={(v) => set({ trial_mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_click">One-click instant access</SelectItem>
                      <SelectItem value="otp">OTP-verified (phone required)</SelectItem>
                      <SelectItem value="form">Full form (name, phone, email)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      value={form.trial_minutes}
                      onChange={(e) => set({ trial_minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Data (MB)</Label>
                    <Input
                      type="number"
                      value={form.trial_data_mb}
                      onChange={(e) => set({ trial_data_mb: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Max / device / day</Label>
                    <Input
                      type="number"
                      value={form.trial_max_per_device_per_day}
                      onChange={(e) => set({ trial_max_per_device_per_day: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anti-abuse: device fingerprint and MAC address are recorded on every trial grant and
                  checked against the daily limit.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New ad slot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Input value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={ad.kind} onValueChange={(v: any) => setAd({ ...ad, kind: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image (JPG/PNG)</SelectItem>
                        <SelectItem value="video">Video (MP4, muted autoplay)</SelectItem>
                        <SelectItem value="text">Text banner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {ad.kind === "text" ? (
                    <div className="sm:col-span-2">
                      <Label>Banner text</Label>
                      <Input value={ad.body_text} onChange={(e) => setAd({ ...ad, body_text: e.target.value })} />
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <Label>Asset URL</Label>
                      <Input value={ad.asset_url} onChange={(e) => setAd({ ...ad, asset_url: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <Label>Starts</Label>
                    <Input
                      type="date"
                      value={ad.starts_at}
                      onChange={(e) => setAd({ ...ad, starts_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Ends</Label>
                    <Input
                      type="date"
                      value={ad.ends_at}
                      onChange={(e) => setAd({ ...ad, ends_at: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Click-through URL</Label>
                    <Input value={ad.target_url} onChange={(e) => setAd({ ...ad, target_url: e.target.value })} />
                  </div>
                </div>
                <Button disabled={!ad.title.trim() || addAd.isPending} onClick={() => addAd.mutate()}>
                  <Megaphone className="mr-1.5 h-4 w-4" />
                  Add ad slot
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {ads.map((a) => {
                const ctr = a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0.0";
                return (
                  <Card key={a.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{a.title}</p>
                          <Badge variant="outline">{a.kind}</Badge>
                          {!a.is_active ? <Badge variant="destructive">off</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.impressions} impressions · {a.clicks} clicks · {ctr}% CTR
                          {a.starts_at ? ` · from ${new Date(a.starts_at).toLocaleDateString()}` : ""}
                          {a.ends_at ? ` to ${new Date(a.ends_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => dropAd.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border border-border p-5 text-center"
              style={{
                background: form.background_url
                  ? `url(${form.background_url}) center/cover`
                  : form.secondary_color,
                color: form.primary_color,
              }}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Portal logo" className="mx-auto mb-3 h-10 object-contain" />
              ) : (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">SOUK JUNUB</p>
              )}
              <p className="text-lg font-semibold">{form.welcome_title}</p>
              <p className="mt-1 text-xs opacity-80">{form.welcome_message}</p>
              <div className="mx-auto mt-4 max-w-64 space-y-2">
                {form.allow_voucher ? (
                  <div className="rounded-md bg-white/10 px-3 py-2 text-xs">Voucher code</div>
                ) : null}
                {form.allow_userpass ? (
                  <div className="rounded-md bg-white/10 px-3 py-2 text-xs">Username / password</div>
                ) : null}
                {form.allow_otp ? (
                  <div className="rounded-md bg-white/10 px-3 py-2 text-xs">Phone + OTP</div>
                ) : null}
                <div
                  className="rounded-md px-3 py-2 text-xs font-semibold"
                  style={{ background: form.accent_color, color: form.secondary_color }}
                >
                  Connect
                </div>
                {form.trial_enabled ? (
                  <p className="text-[11px] opacity-80">
                    Free trial: {form.trial_minutes} min / {form.trial_data_mb} MB
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-[10px] opacity-70">{form.terms_text}</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Public portal URL: <span className="font-mono">/wifi</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
