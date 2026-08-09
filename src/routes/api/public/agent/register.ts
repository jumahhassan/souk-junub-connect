import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRegister } = await import("@/lib/agent-api.server");
        return handleRegister(request);
      },
    },
  },
});
