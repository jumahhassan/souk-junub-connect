import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agent/backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleBackupUpload } = await import("@/lib/agent-api.server");
        return handleBackupUpload(request);
      },
    },
  },
});
