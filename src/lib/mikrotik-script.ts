/**
 * RouterOS provisioning script generator.
 * Browser-safe: pure string building, no server-only imports, so the wizard can
 * preview the exact script that will be pushed before anything is applied.
 */

export type ProvisioningInput = {
  routerName: string;
  hotspotInterface: string;
  hotspotNetwork: string; // e.g. 10.51.0.0/24
  gatewayAddress: string; // e.g. 10.51.0.1
  poolStart: string;
  poolEnd: string;
  dnsServers: string;
  wanInterface: string;
  rateLimit: string; // e.g. 4M/4M
  sessionTimeout: string; // e.g. 1d
  walledGarden: string[]; // hostnames / IPs allowed before login
  apiUsername: string;
};

export const DEFAULT_WALLED_GARDEN = [
  "*.mtn.com",
  "*.zain.com",
  "*.digitel.ss",
  "*.souk-junub.app",
];

export const PROVISIONING_STEPS = [
  { key: "verify", label: "Verify connectivity and fetch router info" },
  { key: "backup", label: "Take a pre-change configuration backup" },
  { key: "hotspot_profile", label: "Create hotspot server profile" },
  { key: "user_profile", label: "Create hotspot user profile with bandwidth limits" },
  { key: "dhcp", label: "Configure DHCP server and address pool" },
  { key: "walled_garden", label: "Configure walled garden" },
  { key: "firewall", label: "Install hotspot firewall rules" },
  { key: "nat", label: "Configure NAT masquerade" },
  { key: "api_user", label: "Create restricted API user" },
  { key: "verify_config", label: "Verify configuration and activate router" },
] as const;

export type ProvisioningStepKey = (typeof PROVISIONING_STEPS)[number]["key"];

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "souk-junub"
  );
}

export function buildProvisioningScript(input: ProvisioningInput): string {
  const id = slug(input.routerName);
  const profile = `sj-${id}`;
  const pool = `sj-pool-${id}`;
  const garden = input.walledGarden.filter(Boolean);

  return `# ============================================================
# SOUK JUNUB auto-provisioning script
# Router: ${input.routerName}
# Generated: ${new Date().toISOString()}
# Applied by the on-site Souk Junub Agent over the RouterOS API.
# ============================================================

# --- Address pool + gateway address -------------------------
/ip pool add name="${pool}" ranges=${input.poolStart}-${input.poolEnd}
/ip address add address=${input.gatewayAddress}/24 interface=${input.hotspotInterface} comment="SOUK JUNUB hotspot gateway"

# --- DHCP server --------------------------------------------
/ip dhcp-server add name="dhcp-${id}" interface=${input.hotspotInterface} address-pool="${pool}" lease-time=1h disabled=no
/ip dhcp-server network add address=${input.hotspotNetwork} gateway=${input.gatewayAddress} dns-server=${input.dnsServers} comment="SOUK JUNUB"

# --- Hotspot server profile ---------------------------------
/ip hotspot profile add name="${profile}" hotspot-address=${input.gatewayAddress} dns-name="login.souk-junub" login-by=http-chap,http-pap use-radius=no
/ip hotspot add name="hs-${id}" interface=${input.hotspotInterface} address-pool="${pool}" profile="${profile}" addresses-per-mac=2 disabled=no

# --- Hotspot user profile (bandwidth limits) ----------------
/ip hotspot user profile add name="${profile}-users" rate-limit=${input.rateLimit} session-timeout=${input.sessionTimeout} shared-users=1 status-autorefresh=1m

# --- Walled garden (reachable before payment) ---------------
${garden.map((host) => `/ip hotspot walled-garden add dst-host="${host}" action=allow comment="SOUK JUNUB"`).join("\n")}

# --- Firewall -----------------------------------------------
/ip firewall filter add chain=forward in-interface=${input.hotspotInterface} connection-state=established,related action=accept comment="SOUK JUNUB hotspot established"
/ip firewall filter add chain=forward in-interface=${input.hotspotInterface} hotspot=auth action=accept comment="SOUK JUNUB authorised clients"
/ip firewall filter add chain=forward in-interface=${input.hotspotInterface} action=drop comment="SOUK JUNUB drop unauthorised"

# --- NAT masquerade -----------------------------------------
/ip firewall nat add chain=srcnat src-address=${input.hotspotNetwork} out-interface=${input.wanInterface} action=masquerade comment="SOUK JUNUB hotspot NAT"

# --- Restricted API user ------------------------------------
/user group add name=souk-junub-api policy=read,write,api,test,winbox,!local,!telnet,!ssh,!ftp,!reboot,!policy,!password,!sniff,!sensitive,!romon
/user add name=${input.apiUsername} group=souk-junub-api comment="SOUK JUNUB managed API user"

# --- Post-change backup -------------------------------------
/system backup save name="souk-junub-${id}"
`;
}

export function buildRollbackScript(input: ProvisioningInput): string {
  const id = slug(input.routerName);
  const profile = `sj-${id}`;
  return `# SOUK JUNUB rollback for ${input.routerName}
/user remove [find name="${input.apiUsername}"]
/user group remove [find name="souk-junub-api"]
/ip firewall nat remove [find comment="SOUK JUNUB hotspot NAT"]
/ip firewall filter remove [find comment~"SOUK JUNUB"]
/ip hotspot walled-garden remove [find comment="SOUK JUNUB"]
/ip hotspot user profile remove [find name="${profile}-users"]
/ip hotspot remove [find name="hs-${id}"]
/ip hotspot profile remove [find name="${profile}"]
/ip dhcp-server network remove [find comment="SOUK JUNUB"]
/ip dhcp-server remove [find name="dhcp-${id}"]
/ip pool remove [find name="sj-pool-${id}"]
/ip address remove [find comment="SOUK JUNUB hotspot gateway"]
`;
}
