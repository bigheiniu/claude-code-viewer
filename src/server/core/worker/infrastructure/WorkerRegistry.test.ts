import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { WorkerRegistry } from "./WorkerRegistry";

// testFileSystemLayer accepts Partial<FileSystem.FileSystem> method overrides.
// layerNoop defaults all methods to no-ops, so CRUD works in-memory via Ref.
const makeTestLayer = () => {
  const deps = Layer.mergeAll(
    testPlatformLayer(),
    testFileSystemLayer({
      exists: () => Effect.succeed(false),
      writeFileString: () => Effect.void,
      makeDirectory: () => Effect.void,
    }),
    Path.layer,
  );
  return Layer.mergeAll(deps, WorkerRegistry.Live.pipe(Layer.provide(deps)));
};

describe("WorkerRegistry", () => {
  describe("getWorkers", () => {
    it("returns empty array when no workers exist", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        return yield* registry.getWorkers();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeTestLayer())),
      );

      expect(result).toEqual([]);
    });
  });

  describe("createWorker", () => {
    it("creates a worker and returns it", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;

        const worker = yield* registry.createWorker({
          name: "eval-builder",
          description: "Builds evaluation tasks",
          projectId: "test-project",
          sessionId: null,
          sessionProcessId: null,
          tags: ["eval"],
        });

        expect(worker.name).toBe("eval-builder");
        expect(worker.description).toBe("Builds evaluation tasks");
        expect(worker.projectId).toBe("test-project");
        expect(worker.sessionId).toBeNull();
        expect(worker.sessionProcessId).toBeNull();
        expect(worker.tags).toEqual(["eval"]);
        expect(worker.id).toBeDefined();
        expect(worker.createdAt).toBeDefined();
        expect(worker.updatedAt).toBeDefined();

        const workers = yield* registry.getWorkers();
        expect(workers).toHaveLength(1);
        expect(workers[0]?.id).toBe(worker.id);
      });

      await Effect.runPromise(program.pipe(Effect.provide(makeTestLayer())));
    });
  });

  describe("getWorker", () => {
    it("returns a worker by id", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;

        const created = yield* registry.createWorker({
          name: "test",
          description: "test desc",
          projectId: "test-project",
          sessionId: null,
          sessionProcessId: null,
          tags: [],
        });

        const found = yield* registry.getWorker(created.id);
        expect(found.id).toBe(created.id);
        expect(found.name).toBe("test");
      });

      await Effect.runPromise(program.pipe(Effect.provide(makeTestLayer())));
    });

    it("fails with WorkerNotFoundError for unknown id", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        yield* registry.getWorker("nonexistent");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeTestLayer()), Effect.flip),
      );

      expect(result._tag).toBe("WorkerNotFoundError");
    });
  });

  describe("updateWorker", () => {
    it("updates worker fields", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;

        const created = yield* registry.createWorker({
          name: "old-name",
          description: "old desc",
          projectId: "test-project",
          sessionId: null,
          sessionProcessId: null,
          tags: [],
        });

        vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));

        const updated = yield* registry.updateWorker(created.id, {
          name: "new-name",
          tags: ["updated"],
        });

        expect(updated.name).toBe("new-name");
        expect(updated.description).toBe("old desc");
        expect(updated.tags).toEqual(["updated"]);
        expect(updated.updatedAt).not.toBe(created.updatedAt);
      });

      await Effect.runPromise(program.pipe(Effect.provide(makeTestLayer())));
      vi.useRealTimers();
    });

    it("fails with WorkerNotFoundError for unknown id", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        yield* registry.updateWorker("nonexistent", { name: "nope" });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeTestLayer()), Effect.flip),
      );

      expect(result._tag).toBe("WorkerNotFoundError");
    });
  });

  describe("deleteWorker", () => {
    it("removes a worker", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;

        const created = yield* registry.createWorker({
          name: "to-delete",
          description: "will be deleted",
          projectId: "test-project",
          sessionId: null,
          sessionProcessId: null,
          tags: [],
        });

        yield* registry.deleteWorker(created.id);

        const workers = yield* registry.getWorkers();
        expect(workers).toHaveLength(0);
      });

      await Effect.runPromise(program.pipe(Effect.provide(makeTestLayer())));
    });

    it("fails with WorkerNotFoundError for unknown id", async () => {
      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        yield* registry.deleteWorker("nonexistent");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(makeTestLayer()), Effect.flip),
      );

      expect(result._tag).toBe("WorkerNotFoundError");
    });
  });

  describe("persistence", () => {
    it("round-trips workers through JSON serialization", async () => {
      let savedContent = "";
      const persistenceDeps = Layer.mergeAll(
        testPlatformLayer(),
        testFileSystemLayer({
          exists: () => Effect.succeed(false),
          writeFileString: (_path, content) => {
            savedContent = content;
            return Effect.void;
          },
          makeDirectory: () => Effect.void,
        }),
        Path.layer,
      );
      const persistenceLayer = Layer.mergeAll(
        persistenceDeps,
        WorkerRegistry.Live.pipe(Layer.provide(persistenceDeps)),
      );

      const program = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        return yield* registry.createWorker({
          name: "persistent-worker",
          description: "should persist",
          projectId: "project-1",
          sessionId: "session-1",
          sessionProcessId: "process-1",
          tags: ["test"],
        });
      });

      const created = await Effect.runPromise(
        program.pipe(Effect.provide(persistenceLayer)),
      );

      const parsed = JSON.parse(savedContent);
      expect(parsed.version).toBe(1);
      expect(parsed.workers).toHaveLength(1);
      expect(parsed.workers[0].id).toBe(created.id);
      expect(parsed.workers[0].name).toBe("persistent-worker");

      const loadDeps = Layer.mergeAll(
        testPlatformLayer(),
        testFileSystemLayer({
          exists: () => Effect.succeed(true),
          readFileString: () => Effect.succeed(savedContent),
          writeFileString: () => Effect.void,
          makeDirectory: () => Effect.void,
        }),
        Path.layer,
      );
      const loadLayer = Layer.mergeAll(
        loadDeps,
        WorkerRegistry.Live.pipe(Layer.provide(loadDeps)),
      );

      const loadProgram = Effect.gen(function* () {
        const registry = yield* WorkerRegistry;
        return yield* registry.getWorkers();
      });

      const loaded = await Effect.runPromise(
        loadProgram.pipe(Effect.provide(loadLayer)),
      );

      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.id).toBe(created.id);
      expect(loaded[0]?.name).toBe("persistent-worker");
    });
  });
});
