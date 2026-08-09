import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Palette,
  Radio,
  Router as RouterIcon,
  ServerCog,
  Ticket,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/routers", label: "Routers", icon: RouterIcon },
  { to: "/packages", label: "Packages", icon: Package },
  { to: "/vouchers", label: "Vouchers", icon: Ticket },
  { to: "/hotspot-users", label: "Hotspot users", icon: Users },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/portal", label: "Portal", icon: Palette },
  { to: "/sites", label: "Sites", icon: MapPin },
  { to: "/agents", label: "Agents", icon: ServerCog },
  { to: "/alerts", label: "Alerts", icon: BellRing },
] as const;


export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radio className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-sidebar-foreground">SOUK JUNUB</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Network Ops
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card/60 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-foreground md:text-2xl">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs",
                pathname.startsWith(item.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-5 py-6 md:px-8">{children}</main>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground md:px-8">
          <Activity className="h-3.5 w-3.5 text-primary" />
          SOUK JUNUB — South Sudan ISP &amp; WiFi operations. All billing values in SSP.
        </footer>
      </div>
    </div>
  );
}
