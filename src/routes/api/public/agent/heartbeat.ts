import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleHeartbeat } = await import("@/lib/agent-api.server");
        return handleHeartbeat(request);
      },
    },
  },
});
