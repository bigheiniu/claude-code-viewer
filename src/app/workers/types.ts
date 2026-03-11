import type { workerListQuery } from "@/lib/api/queries";

// Infer WorkerView from the Hono RPC response type — no manual type definition needed.
// workerListQuery.queryFn returns Promise<{ workers: WorkerView[] }>
type WorkerListResponse = Awaited<ReturnType<typeof workerListQuery.queryFn>>;
export type WorkerView = WorkerListResponse["workers"][number];

export type WorkerStatus = WorkerView["status"];
