import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkersPage } from "../../app/workers/page";
import { ProtectedRoute } from "../../components/ProtectedRoute";

const workersSearchSchema = z.object({
  workerId: z.string().optional(),
});

export const Route = createFileRoute("/workers/")({
  component: RouteComponent,
  validateSearch: (search) => workersSearchSchema.parse(search),
});

function RouteComponent() {
  return (
    <ProtectedRoute>
      <WorkersPage />
    </ProtectedRoute>
  );
}
