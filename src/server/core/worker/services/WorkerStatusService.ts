import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import type {
  WorkerDefinition,
  WorkerStatus,
  WorkerView,
} from "../models/Worker";

const LayerImpl = Effect.gen(function* () {
  const sessionProcessService = yield* ClaudeCodeSessionProcessService;

  const getWorkerStatus = (
    worker: WorkerDefinition,
  ): Effect.Effect<{ status: WorkerStatus; lastActivityAt: string | null }> =>
    Effect.gen(function* () {
      if (worker.sessionProcessId === null) {
        return { status: "idle", lastActivityAt: null };
      }

      const processes = yield* sessionProcessService.getSessionProcesses();
      const process = processes.find(
        (p) => p.def.sessionProcessId === worker.sessionProcessId,
      );

      if (process === undefined) {
        return { status: "idle", lastActivityAt: null };
      }

      switch (process.type) {
        case "initialized":
        case "file_created":
          return {
            status: "running",
            lastActivityAt: new Date().toISOString(),
          };
        case "paused":
          return {
            status: "paused",
            lastActivityAt: new Date().toISOString(),
          };
        default:
          return { status: "idle", lastActivityAt: null };
      }
    });

  const enrichWorker = (worker: WorkerDefinition): Effect.Effect<WorkerView> =>
    Effect.gen(function* () {
      const { status, lastActivityAt } = yield* getWorkerStatus(worker);
      return {
        ...worker,
        status,
        lastActivityAt,
      };
    });

  return {
    getWorkerStatus,
    enrichWorker,
  };
});

export type IWorkerStatusService = InferEffect<typeof LayerImpl>;

export class WorkerStatusService extends Context.Tag("WorkerStatusService")<
  WorkerStatusService,
  IWorkerStatusService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
