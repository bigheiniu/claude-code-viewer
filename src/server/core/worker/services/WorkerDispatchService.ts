import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { WorkerRegistry } from "../infrastructure/WorkerRegistry";
import { WorkerNoActiveProcessError } from "../models/Worker";

const LayerImpl = Effect.gen(function* () {
  const registry = yield* WorkerRegistry;
  const lifeCycleService = yield* ClaudeCodeLifeCycleService;

  const sendMessage = (workerId: string, message: string) =>
    Effect.gen(function* () {
      const worker = yield* registry.getWorker(workerId);

      if (worker.sessionProcessId === null || worker.sessionId === null) {
        return yield* Effect.fail(new WorkerNoActiveProcessError({ workerId }));
      }

      return yield* lifeCycleService.continueSessionProcess({
        sessionProcessId: worker.sessionProcessId,
        baseSessionId: worker.sessionId,
        input: { text: message },
      });
    });

  const abortWorker = (workerId: string) =>
    Effect.gen(function* () {
      const worker = yield* registry.getWorker(workerId);

      if (worker.sessionProcessId === null) {
        return yield* Effect.fail(new WorkerNoActiveProcessError({ workerId }));
      }

      yield* lifeCycleService.abortTask(worker.sessionProcessId);
    });

  return {
    sendMessage,
    abortWorker,
  };
});

export type IWorkerDispatchService = InferEffect<typeof LayerImpl>;

export class WorkerDispatchService extends Context.Tag("WorkerDispatchService")<
  WorkerDispatchService,
  IWorkerDispatchService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
