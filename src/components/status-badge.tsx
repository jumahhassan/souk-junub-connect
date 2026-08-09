import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  online: "bg-success/15 text-success border-success/30",
  offline: "bg-destructive/15 text-destructive border-destructive/30",
  provisioning: "bg-info/15 text-info border-info/30",
  pending: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
  succeeded: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  running: "bg-info/15 text-info border-info/30",
  rolled_back: "bg-warning/15 text-warning border-warning/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  label,
  pulse,
}: {
  status: string;
  label?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE[status] ?? TONE["pending"],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          pulse && status === "online" && "animate-pulse",
        )}
      />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
