import type { UUID } from "node:crypto";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import type {
  CCSessionProcessCompletedState,
  CCSessionProcessDef,
  CCSessionProcessFileCreatedState,
  CCSessionProcessInitializedState,
  CCSessionProcessNotInitializedState,
  CCSessionProcessPausedState,
  CCSessionProcessPendingState,
  CCSessionProcessState,
} from "../../claude-code/models/CCSessionProcess";
import type {
  PendingClaudeCodeTurnState,
  RunningClaudeCodeTurnState,
} from "../../claude-code/models/ClaudeCodeTurn";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import type { InitMessageContext } from "../../claude-code/types";
import type { WorkerDefinition } from "../models/Worker";
import { WorkerStatusService } from "./WorkerStatusService";

const makeWorker = (
  overrides: Partial<WorkerDefinition> = {},
): WorkerDefinition => ({
  id: "worker-1",
  name: "test-worker",
  description: "test",
  projectId: "project-1",
  sessionId: "session-1",
  sessionProcessId: "process-1",
  tags: [],
  createdAt: "2026-03-10T00:00:00.000Z",
  updatedAt: "2026-03-10T00:00:00.000Z",
  ...overrides,
});

const makeSessionProcessDef = (
  sessionProcessId: string,
): CCSessionProcessDef => ({
  sessionProcessId,
  projectId: "project-1",
  cwd: "/tmp/test",
  abortController: new AbortController(),
  setNextMessage: () => {},
});

const makePendingTurnDef = (): PendingClaudeCodeTurnState => ({
  def: {
    turnId: "turn-1",
    type: "new",
    sessionId: undefined,
    baseSessionId: undefined,
  },
  status: "pending",
  sessionId: undefined,
});

const makeRunningTurnDef = (): RunningClaudeCodeTurnState => ({
  def: {
    turnId: "turn-1",
    type: "new",
    sessionId: undefined,
    baseSessionId: undefined,
  },
  status: "running",
  sessionId: undefined,
});

const makeInitContext = (): InitMessageContext => ({
  initMessage: {
    type: "system",
    subtype: "init",
    apiKeySource: "user",
    claude_code_version: "1.0.0",
    cwd: "/tmp/test",
    tools: [],
    mcp_servers: [],
    model: "claude-sonnet-4-20250514",
    permissionMode: "default",
    slash_commands: [],
    output_style: "text",
    skills: [],
    plugins: [],
    uuid: "test-uuid" satisfies string as UUID,
    session_id: "session-1",
  },
});

const makeMockProcess = (
  sessionProcessId: string,
  type: CCSessionProcessState["type"],
): CCSessionProcessState => {
  const def = makeSessionProcessDef(sessionProcessId);

  switch (type) {
    case "pending": {
      const state: CCSessionProcessPendingState = {
        def,
        type: "pending",
        sessionId: undefined,
        tasks: [makePendingTurnDef()],
        currentTask: makePendingTurnDef(),
      };
      return state;
    }
    case "not_initialized": {
      const state: CCSessionProcessNotInitializedState = {
        def,
        type: "not_initialized",
        sessionId: undefined,
        tasks: [makeRunningTurnDef()],
        currentTask: makeRunningTurnDef(),
        rawUserMessage: "test",
      };
      return state;
    }
    case "initialized": {
      const state: CCSessionProcessInitializedState = {
        def,
        type: "initialized",
        sessionId: "session-1",
        tasks: [makeRunningTurnDef()],
        currentTask: makeRunningTurnDef(),
        rawUserMessage: "test",
        initContext: makeInitContext(),
      };
      return state;
    }
    case "file_created": {
      const state: CCSessionProcessFileCreatedState = {
        def,
        type: "file_created",
        sessionId: "session-1",
        tasks: [makeRunningTurnDef()],
        currentTask: makeRunningTurnDef(),
        rawUserMessage: "test",
        initContext: makeInitContext(),
      };
      return state;
    }
    case "paused": {
      const state: CCSessionProcessPausedState = {
        def,
        type: "paused",
        sessionId: "session-1",
        tasks: [makePendingTurnDef()],
      };
      return state;
    }
    case "completed": {
      const state: CCSessionProcessCompletedState = {
        def,
        type: "completed",
        sessionId: "session-1",
        tasks: [makePendingTurnDef()],
      };
      return state;
    }
  }
};

const makeMockSessionProcessService = (processes: CCSessionProcessState[]) =>
  Layer.mock(ClaudeCodeSessionProcessService, {
    getSessionProcesses: () => Effect.succeed(processes),
  });

describe("WorkerStatusService", () => {
  it("returns idle when worker has no sessionProcessId", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker({ sessionProcessId: null });
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(makeMockSessionProcessService([])),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("idle");
  });

  it("returns idle when no matching process found", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker({ sessionProcessId: "nonexistent" });
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(makeMockSessionProcessService([])),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("idle");
  });

  it("returns running when process is in initialized state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "initialized"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("running");
  });

  it("returns running when process is in file_created state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "file_created"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("running");
  });

  it("returns paused when process is in paused state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "paused"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("paused");
  });

  it("returns idle when process is in completed state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "completed"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("idle");
  });

  it("returns idle when process is in pending state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "pending"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("idle");
  });

  it("returns idle when process is in not_initialized state", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.getWorkerStatus(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "not_initialized"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("idle");
  });

  it("enriches worker with status and lastActivityAt", async () => {
    const program = Effect.gen(function* () {
      const service = yield* WorkerStatusService;
      const worker = makeWorker();
      return yield* service.enrichWorker(worker);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(WorkerStatusService.Live),
        Effect.provide(
          makeMockSessionProcessService([
            makeMockProcess("process-1", "initialized"),
          ]),
        ),
        Effect.provide(testPlatformLayer()),
      ),
    );

    expect(result.status).toBe("running");
    expect(result.lastActivityAt).not.toBeNull();
    expect(result.id).toBe("worker-1");
    expect(result.name).toBe("test-worker");
  });
});
