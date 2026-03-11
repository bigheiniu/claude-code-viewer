import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import { WorkerRegistry } from "../infrastructure/WorkerRegistry";
import { WorkerStatusService } from "../services/WorkerStatusService";
import { WorkerController } from "./WorkerController";

const makeMockSessionProcessService = () =>
  Layer.mock(ClaudeCodeSessionProcessService, {
    getSessionProcesses: () => Effect.succeed([]),
  });

const makeTestLayer = () => {
  const baseDeps = Layer.mergeAll(
    testPlatformLayer(),
    testFileSystemLayer({
      exists: () => Effect.succeed(false),
      writeFileString: () => Effect.void,
      makeDirectory: () => Effect.void,
    }),
    Path.layer,
    makeMockSessionProcessService(),
  );

  const registryLayer = WorkerRegistry.Live.pipe(Layer.provide(baseDeps));
  const statusLayer = WorkerStatusService.Live.pipe(Layer.provide(baseDeps));

  const servicesLayer = Layer.mergeAll(baseDeps, registryLayer, statusLayer);

  const controllerLayer = WorkerController.Live.pipe(
    Layer.provide(servicesLayer),
  );

  return Layer.mergeAll(servicesLayer, controllerLayer);
};

describe("WorkerController", () => {
  it("listWorkers returns empty list initially", async () => {
    const program = Effect.gen(function* () {
      const controller = yield* WorkerController;
      return yield* controller.listWorkers();
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(makeTestLayer())),
    );

    expect(result.status).toBe(200);
    expect(result.response).toEqual({ workers: [] });
  });

  it("createWorker creates and returns a worker with status", async () => {
    const program = Effect.gen(function* () {
      const controller = yield* WorkerController;
      return yield* controller.createWorker({
        name: "eval-builder",
        description: "Builds evaluation tasks",
        projectId: "test-project",
        sessionId: null,
        sessionProcessId: null,
        tags: ["eval"],
      });
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(makeTestLayer())),
    );

    expect(result.status).toBe(201);
    expect(result.response.worker.name).toBe("eval-builder");
    expect(result.response.worker.status).toBe("idle");
  });

  it("getWorker returns 404 for nonexistent worker", async () => {
    const program = Effect.gen(function* () {
      const controller = yield* WorkerController;
      return yield* controller.getWorker("nonexistent");
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(makeTestLayer())),
    );

    expect(result.status).toBe(404);
  });

  it("deleteWorker deletes a worker and returns success", async () => {
    const program = Effect.gen(function* () {
      const controller = yield* WorkerController;

      const createResult = yield* controller.createWorker({
        name: "to-delete",
        description: "will be deleted",
        projectId: "test-project",
        sessionId: null,
        sessionProcessId: null,
        tags: [],
      });

      const workerId = createResult.response.worker.id;
      const deleteResult = yield* controller.deleteWorker(workerId);
      expect(deleteResult.status).toBe(200);

      const listResult = yield* controller.listWorkers();
      expect(listResult.response).toEqual({ workers: [] });
    });

    await Effect.runPromise(program.pipe(Effect.provide(makeTestLayer())));
  });
});
