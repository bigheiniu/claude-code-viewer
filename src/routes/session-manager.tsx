import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SessionManagerView } from "../features/session-manager";

export const Route = createFileRoute("/session-manager")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute>
      <title>Session Manager - Claude Code Viewer</title>
      <SessionManagerView />
    </ProtectedRoute>
  );
}
