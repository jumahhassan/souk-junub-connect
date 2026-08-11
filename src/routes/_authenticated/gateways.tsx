/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGateways, saveGateway } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/gateways")({
  head: () => ({
    meta: [
      { title: "Payment Gateways | SOUK JUNUB" },
      {
        name: "description",
        content:
          "Configure MTN MoMo South Sudan, Zain Cash, NIPS, Tola Mobile, Flutterwave, Paystack and manual bank transfer for SSP collections.",
      },
      { property: "og:title", content: "Payment Gateways | SOUK JUNUB" },
      {
        property: "og:description",
        content: "South Sudan payment gateway credentials, callbacks and environments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GatewaysPage,
});

function GatewayCard({ gw, onSave }: { gw: any; onSave: (payload: any) => void }) {
  const [state, setState] = useState({
    environment: gw.environment as "sandbox" | "production",
    phonePrefix: gw.phone_prefix ?? "",
    callbackUrl: gw.callback_url ?? "",
    config: { ...(gw.config ?? {}) } as Record<string, string>,
    isActive: gw.is_active as boolean,
    isDefault: gw.is_default as boolean,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {gw.label}
          {gw.is_default ? <Badge>default</Badge> : null}
          <Badge variant={state.isActive ? "outline" : "secondary"}>
            {state.isActive ? "active" : "disabled"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Environment</Label>
            <Select
              value={state.environment}
              onValueChange={(v) => setState((s) => ({ ...s, environment: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone prefix</Label>
            <Input
              value={state.phonePrefix}
              placeholder="+21192"
              onChange={(e) => setState((s) => ({ ...s, phonePrefix: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Callback URL</Label>
          <Input
            value={state.callbackUrl}
            placeholder="https://souk-junub-connect.lovable.app/api/public/hooks/momo"
            onChange={(e) => setState((s) => ({ ...s, callbackUrl: e.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.keys(state.config).map((key) => (
            <div key={key}>
              <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
              <Input
                value={state.config[key] ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, config: { ...s.config, [key]: e.target.value } }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={state.isActive}
              onCheckedChange={(v) => setState((s) => ({ ...s, isActive: v }))}
            />
            <span className="text-sm">Enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={state.isDefault}
              onCheckedChange={(v) => setState((s) => ({ ...s, isDefault: v }))}
            />
            <span className="text-sm">Default gateway</span>
          </div>
          <Button className="ml-auto" size="sm" onClick={() => onSave({ id: gw.id, ...state })}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Currency is fixed to SSP. Credentials are stored on the backend and never exposed to the
          captive portal.
        </p>
      </CardContent>
    </Card>
  );
}

function GatewaysPage() {
  const qc = useQueryClient();
  const load = useServerFn(getGateways);
  const save = useServerFn(saveGateway);
  const { data } = useQuery({ queryKey: ["gateways"], queryFn: () => load() });

  const update = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      toast.success("Gateway saved.");
      void qc.invalidateQueries({ queryKey: ["gateways"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Payment gateways"
      description="South Sudan mobile money, bank rails and international fallbacks — all settling in SSP."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((gw: any) => (
          <GatewayCard key={gw.id} gw={gw} onSave={(p) => update.mutate(p)} />
        ))}
      </div>
    </AppShell>
  );
}
