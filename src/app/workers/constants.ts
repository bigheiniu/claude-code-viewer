import type { WorkerStatus } from "./types";

export const statusColors: Record<WorkerStatus, string> = {
  running: "bg-green-500/10 text-green-500 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  idle: "bg-muted text-muted-foreground",
};
