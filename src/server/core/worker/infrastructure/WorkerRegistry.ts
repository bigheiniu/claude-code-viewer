import { homedir } from "node:os";
import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import type { InferEffect } from "../../../lib/effect/types";
import {
  type WorkerCreate,
  type WorkerDefinition,
  WorkerNotFoundError,
  type WorkerUpdate,
  workerRegistryStateSchema,
} from "../models/Worker";

const WORKERS_FILE_NAME = "workers.json";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workersRef = yield* Ref.make<WorkerDefinition[]>([]);

  const getWorkersFilePath = () =>
    path.resolve(homedir(), ".claude-code-viewer", WORKERS_FILE_NAME);

  const loadFromDisk = () =>
    Effect.gen(function* () {
      const filePath = getWorkersFilePath();
      const fileExists = yield* fs.exists(filePath);
      if (!fileExists) return;

      const content = yield* fs.readFileString(filePath);
      const parsed = workerRegistryStateSchema.safeParse(JSON.parse(content));
      if (parsed.success) {
        yield* Ref.set(workersRef, parsed.data.workers);
      }
    }).pipe(Effect.catchAll(() => Effect.void));

  const saveToDisk = () =>
    Effect.gen(function* () {
      const workers = yield* Ref.get(workersRef);
      const filePath = getWorkersFilePath();
      const dir = path.dirname(filePath);

      const dirExists = yield* fs.exists(dir);
      if (!dirExists) {
        yield* fs.makeDirectory(dir, { recursive: true });
      }

      const state = { version: 1, workers };
      yield* fs.writeFileString(filePath, JSON.stringify(state, null, 2));
    });

  // Load existing data on initialization
  yield* loadFromDisk();

  const getWorkers = () => Ref.get(workersRef);

  const getWorker = (workerId: string) =>
    Effect.gen(function* () {
      const workers = yield* Ref.get(workersRef);
      const worker = workers.find((w) => w.id === workerId);
      if (worker === undefined) {
        return yield* Effect.fail(new WorkerNotFoundError({ workerId }));
      }
      return worker;
    });

  const createWorker = (input: WorkerCreate) =>
    Effect.gen(function* () {
      const now = new Date().toISOString();
      const worker: WorkerDefinition = {
        id: ulid(),
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        sessionId: input.sessionId,
        sessionProcessId: input.sessionProcessId,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
      };

      yield* Ref.update(workersRef, (workers) => [...workers, worker]);
      yield* saveToDisk();
      return worker;
    });

  const updateWorker = (workerId: string, input: WorkerUpdate) =>
    Effect.gen(function* () {
      const existing = yield* getWorker(workerId);
      const now = new Date().toISOString();
      const updated: WorkerDefinition = {
        ...existing,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.sessionId !== undefined
          ? { sessionId: input.sessionId }
          : {}),
        ...(input.sessionProcessId !== undefined
          ? { sessionProcessId: input.sessionProcessId }
          : {}),
        updatedAt: now,
      };

      yield* Ref.update(workersRef, (workers) =>
        workers.map((w) => (w.id === workerId ? updated : w)),
      );
      yield* saveToDisk();
      return updated;
    });

  const deleteWorker = (workerId: string) =>
    Effect.gen(function* () {
      yield* getWorker(workerId);
      yield* Ref.update(workersRef, (workers) =>
        workers.filter((w) => w.id !== workerId),
      );
      yield* saveToDisk();
    });

  return {
    getWorkers,
    getWorker,
    createWorker,
    updateWorker,
    deleteWorker,
  };
});

export type IWorkerRegistry = InferEffect<typeof LayerImpl>;

export class WorkerRegistry extends Context.Tag("WorkerRegistry")<
  WorkerRegistry,
  IWorkerRegistry
>() {
  static Live = Layer.effect(this, LayerImpl);
}
