import { Data } from "effect";
import { z } from "zod";

export const workerDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  projectId: z.string(),
  sessionId: z.string().nullable(),
  sessionProcessId: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkerDefinition = z.infer<typeof workerDefinitionSchema>;

export const workerRegistryStateSchema = z.object({
  version: z.literal(1),
  workers: z.array(workerDefinitionSchema),
});

export type WorkerRegistryState = z.infer<typeof workerRegistryStateSchema>;

export const workerCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  projectId: z.string(),
  sessionId: z.string().nullable().default(null),
  sessionProcessId: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});

export type WorkerCreate = z.infer<typeof workerCreateSchema>;

export const workerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sessionId: z.string().nullable().optional(),
  sessionProcessId: z.string().nullable().optional(),
});

export type WorkerUpdate = z.infer<typeof workerUpdateSchema>;

export const workerMessageSchema = z.object({
  message: z.string().min(1),
});

export type WorkerMessage = z.infer<typeof workerMessageSchema>;

export type WorkerStatus = "idle" | "running" | "paused";

export type WorkerView = WorkerDefinition & {
  status: WorkerStatus;
  lastActivityAt: string | null;
};

export class WorkerNotFoundError extends Data.TaggedError(
  "WorkerNotFoundError",
)<{
  workerId: string;
}> {}

export class WorkerNoActiveProcessError extends Data.TaggedError(
  "WorkerNoActiveProcessError",
)<{
  workerId: string;
}> {}
