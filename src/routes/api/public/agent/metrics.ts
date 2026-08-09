import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleMetrics } = await import("@/lib/agent-api.server");
        return handleMetrics(request);
      },
    },
  },
});
