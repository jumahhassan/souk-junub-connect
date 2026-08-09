import { createFileRoute } from "@tanstack/react-router";

/** Called on a schedule to flip stale routers to offline and raise alerts. */
export const Route = createFileRoute("/api/public/hooks/offline-sweep")({
  server: {
    handlers: {
      POST: async () => {
        const { sweepOfflineRouters } = await import("@/lib/agent-api.server");
        return sweepOfflineRouters();
      },
    },
  },
});
