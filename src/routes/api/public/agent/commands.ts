import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/commands")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleCommands } = await import("@/lib/agent-api.server");
        return handleCommands(request);
      },
    },
  },
});
