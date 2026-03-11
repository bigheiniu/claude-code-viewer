import { Path } from "@effect/platform";
import {
  CommandExecutor,
  makeExecutor,
} from "@effect/platform/CommandExecutor";
import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import type { CCSessionProcessDef } from "../../claude-code/models/CCSessionProcess";
import type { PendingClaudeCodeTurnState } from "../../claude-code/models/ClaudeCodeTurn";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { WorkerRegistry } from "../infrastructure/WorkerRegistry";
import { WorkerDispatchService } from "./WorkerDispatchService";

let mockContinueCalled = false;
let mockAbortCalled = false;

beforeEach(() => {
  mockContinueCalled = false;
  mockAbortCalled = false;
});

const fsOverrides = {
  exists: () => Effect.succeed(false),
  writeFileString: () => Effect.void,
  makeDirectory: () => Effect.void,
};

const makeMockSessionProcessDef = (): CCSessionProcessDef => ({
  sessionProcessId: "mock-process",
  projectId: "mock-project",
  cwd: "/tmp/mock",
  abortController: new AbortController(),
  setNextMessage: () => {},
});

const makeMockPendingTurn = (): PendingClaudeCodeTurnState => ({
  def: {
    turnId: "mock-turn",
    type: "new",
    sessionId: undefined,
    baseSessionId: undefined,
  },
  status: "pending",
  sessionId: undefined,
});

const makeMockLifeCycleService = () =>
  Layer.mock(ClaudeCodeLifeCycleService, {
    continueSessionProcess: () =>
      Effect.sync(() => {
        mockContinueCalled = true;
        return {
          sessionProcess: {
            type: "pending",
            def: makeMockSessionProcessDef(),
            tasks: [makeMockPendingTurn()],
            currentTask: makeMockPendingTurn(),
            sessionId: undefined,
          },
          task: makeMockPendingTurn(),
        };
      }),
    abortTask: () => {
      mockAbortCalled = true;
      return Effect.void;
    },
  });

const makeMockCommandExecutorLayer = () =>
  Layer.succeed(
    CommandExecutor,
    makeExecutor(() => Effect.die("not implemented")),
  );

const makeDispatchTestLayer = () => {
  const deps = Layer.mergeAll(
    testPlatformLayer(),
    testFileSystemLayer(fsOverrides),
    Path.layer,
    makeMockLifeCycleService(),
    makeMockCommandExecutorLayer(),
  );
  return Layer.mergeAll(
    deps,
    WorkerRegistry.Live.pipe(Layer.provide(deps)),
    WorkerDispatchService.Live.pipe(
      Layer.provide(
        Layer.mergeAll(
          WorkerRegistry.Live.pipe(Layer.provide(deps)),
          makeMockLifeCycleService(),
        ),
      ),
    ),
  );
};

describe("WorkerDispatchService", () => {
  describe("sendMessage", () => {
    it("sends message to a worker with active process", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        const dispatch = yield* WorkerDispatchService;

        const worker = yield* registry.createWorker({
          name: "test-worker",
          description: "test",
          projectId: "project-1",
          sessionId: "session-1",
          sessionProcessId: "process-1",
          tags: [],
        });

        yield* dispatch.sendMessage(worker.id, "hello");
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeDispatchTestLayer())),
      );

      expect(mockContinueCalled).toBe(true);
    });

    it("fails with WorkerNotFoundError for unknown worker", async () => {
      const program = Effect.gen(function* () {
        const dispatch = yield* WorkerDispatchService;
        yield* dispatch.sendMessage("nonexistent", "hello");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeDispatchTestLayer()), Effect.flip),
      );

      expect(result._tag).toBe("WorkerNotFoundError");
    });

    it("fails with WorkerNoActiveProcessError when sessionProcessId is null", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        const dispatch = yield* WorkerDispatchService;

        const worker = yield* registry.createWorker({
          name: "idle-worker",
          description: "no process",
          projectId: "project-1",
          sessionId: null,
          sessionProcessId: null,
          tags: [],
        });

        yield* dispatch.sendMessage(worker.id, "hello");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeDispatchTestLayer()), Effect.flip),
      );

      expect(result._tag).toBe("WorkerNoActiveProcessError");
    });
  });

  describe("abortWorker", () => {
    it("aborts a worker with active process", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        const dispatch = yield* WorkerDispatchService;

        const worker = yield* registry.createWorker({
          name: "running-worker",
          description: "has process",
          projectId: "project-1",
          sessionId: "session-1",
          sessionProcessId: "process-1",
          tags: [],
        });

        yield* dispatch.abortWorker(worker.id);
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(makeDispatchTestLayer())),
      );

      expect(mockAbortCalled).toBe(true);
    });
  });
});
