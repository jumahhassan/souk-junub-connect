import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/command-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCommandResult } = await import("@/lib/agent-api.server");
        return handleCommandResult(request);
      },
    },
  },
});
