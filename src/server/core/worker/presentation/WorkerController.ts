import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { WorkerRegistry } from "../infrastructure/WorkerRegistry";
import type { WorkerCreate, WorkerUpdate } from "../models/Worker";
import { WorkerStatusService } from "../services/WorkerStatusService";

const LayerImpl = Effect.gen(function* () {
  const registry = yield* WorkerRegistry;
  const statusService = yield* WorkerStatusService;

  const listWorkers = () =>
    Effect.gen(function* () {
      const workers = yield* registry.getWorkers();
      const enriched = yield* Effect.all(
        workers.map((w) => statusService.enrichWorker(w)),
        { concurrency: "unbounded" },
      );

      return {
        response: { workers: enriched },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const createWorker = (input: WorkerCreate) =>
    Effect.gen(function* () {
      const worker = yield* registry.createWorker(input);
      const enriched = yield* statusService.enrichWorker(worker);

      return {
        response: { worker: enriched },
        status: 201,
      } as const satisfies ControllerResponse;
    });

  const getWorker = (workerId: string) =>
    Effect.gen(function* () {
      const worker = yield* registry
        .getWorker(workerId)
        .pipe(
          Effect.catchTag("WorkerNotFoundError", () => Effect.succeed(null)),
        );

      if (worker === null) {
        return {
          response: { error: "Worker not found" },
          status: 404,
        } as const satisfies ControllerResponse;
      }

      const enriched = yield* statusService.enrichWorker(worker);

      return {
        response: { worker: enriched },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const updateWorker = (workerId: string, input: WorkerUpdate) =>
    Effect.gen(function* () {
      const worker = yield* registry
        .updateWorker(workerId, input)
        .pipe(
          Effect.catchTag("WorkerNotFoundError", () => Effect.succeed(null)),
        );

      if (worker === null) {
        return {
          response: { error: "Worker not found" },
          status: 404,
        } as const satisfies ControllerResponse;
      }

      const enriched = yield* statusService.enrichWorker(worker);

      return {
        response: { worker: enriched },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const deleteWorker = (workerId: string) =>
    Effect.gen(function* () {
      const result = yield* registry.deleteWorker(workerId).pipe(
        Effect.map(() => true),
        Effect.catchTag("WorkerNotFoundError", () => Effect.succeed(false)),
      );

      if (!result) {
        return {
          response: { error: "Worker not found" },
          status: 404,
        } as const satisfies ControllerResponse;
      }

      return {
        response: { success: true },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    listWorkers,
    createWorker,
    getWorker,
    updateWorker,
    deleteWorker,
  };
});

export type IWorkerController = InferEffect<typeof LayerImpl>;

export class WorkerController extends Context.Tag("WorkerController")<
  WorkerController,
  IWorkerController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
