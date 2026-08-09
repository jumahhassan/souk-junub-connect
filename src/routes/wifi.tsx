import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPortalConfig, redeemVoucher, startFreeTrial } from "@/lib/portal-public.functions";

export const Route = createFileRoute("/wifi")({
  head: () => ({
    meta: [
      { title: "Connect to Souk Junub WiFi" },
      {
        name: "description",
        content:
          "Enter your Souk Junub voucher code or start a free trial to get online across South Sudan hotspots.",
      },
      { property: "og:title", content: "Connect to Souk Junub WiFi" },
      {
        property: "og:description",
        content: "Voucher login and free trial access for Souk Junub hotspots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WifiPortal,
});

function fingerprint() {
  const parts = [navigator.userAgent, screen.width, screen.height, navigator.language].join("|");
  let hash = 0;
  for (let i = 0; i < parts.length; i += 1) hash = (hash * 31 + parts.charCodeAt(i)) | 0;
  return `fp_${Math.abs(hash).toString(36)}`;
}

function WifiPortal() {
  const load = useServerFn(getPortalConfig);
  const redeem = useServerFn(redeemVoucher);
  const trial = useServerFn(startFreeTrial);

  const { data } = useQuery({ queryKey: ["portal-public"], queryFn: () => load() });
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fp, setFp] = useState("");

  useEffect(() => setFp(fingerprint()), []);

  const portal: any = data?.portal;
  const packages: any[] = data?.packages ?? [];
  const ads: any[] = data?.ads ?? [];

  const bg = portal?.background_url
    ? `url(${portal.background_url}) center/cover`
    : (portal?.secondary_color ?? "#0b1a2b");

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: bg, color: portal?.primary_color ?? "#f2b134" }}
    >
      {portal?.custom_css ? <style>{portal.custom_css}</style> : null}
      <div className="w-full max-w-md rounded-xl bg-black/40 p-6 backdrop-blur">
        <div className="text-center">
          {portal?.logo_url ? (
            <img src={portal.logo_url} alt="Souk Junub logo" className="mx-auto mb-3 h-12 object-contain" />
          ) : (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em]">SOUK JUNUB</p>
          )}
          <h1 className="text-xl font-semibold">{portal?.welcome_title ?? "Welcome to Souk Junub WiFi"}</h1>
          {portal?.welcome_message ? (
            <p className="mt-1 text-sm opacity-80">{portal.welcome_message}</p>
          ) : null}
        </div>

        {portal?.allow_voucher !== false ? (
          <div className="mt-6 space-y-2">
            <Input
              value={code}
              placeholder="Voucher code"
              className="text-center font-mono tracking-widest"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button
              className="w-full"
              disabled={code.length < 4 || busy}
              style={{ background: portal?.accent_color, color: portal?.secondary_color }}
              onClick={async () => {
                setBusy(true);
                const r: any = await redeem({ data: { code, macAddress: null } });
                setStatus(r);
                setBusy(false);
              }}
            >
              <Wifi className="mr-1.5 h-4 w-4" />
              Connect
            </Button>
          </div>
        ) : null}

        {portal?.trial_enabled ? (
          <Button
            variant="outline"
            className="mt-3 w-full border-white/30 bg-transparent"
            disabled={busy || !fp}
            onClick={async () => {
              setBusy(true);
              const r: any = await trial({ data: { fingerprint: fp, phone: null } });
              setStatus(r);
              setBusy(false);
            }}
          >
            Start free trial ({portal.trial_minutes} min / {portal.trial_data_mb} MB)
          </Button>
        ) : null}

        {status ? (
          <p className={`mt-3 text-center text-sm ${status.ok ? "opacity-90" : "text-red-300"}`}>
            {status.message}
          </p>
        ) : null}

        {packages.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-widest opacity-70">Buy a package</p>
            <div className="grid grid-cols-2 gap-2">
              {packages.slice(0, 6).map((p) => (
                <div key={p.id} className="rounded-md bg-white/10 px-3 py-2 text-xs">
                  <p className="font-semibold">{p.name}</p>
                  <p className="opacity-80">SSP {Number(p.price_ssp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {ads.length > 0 ? (
          <div className="mt-6 space-y-2">
            {ads.map((a) =>
              a.kind === "image" && a.asset_url ? (
                <img key={a.id} src={a.asset_url} alt={a.title} className="w-full rounded-md" />
              ) : a.kind === "video" && a.asset_url ? (
                <video key={a.id} src={a.asset_url} autoPlay muted loop className="w-full rounded-md" />
              ) : (
                <p key={a.id} className="rounded-md bg-white/10 px-3 py-2 text-center text-xs">
                  {a.body_text ?? a.title}
                </p>
              ),
            )}
          </div>
        ) : null}

        {portal?.terms_text ? (
          <p className="mt-6 text-center text-[10px] opacity-60">{portal.terms_text}</p>
        ) : null}
      </div>
    </main>
  );
}
