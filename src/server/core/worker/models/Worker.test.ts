import { describe, expect, it } from "vitest";
import {
  type WorkerDefinition,
  workerCreateSchema,
  workerDefinitionSchema,
  workerMessageSchema,
  workerRegistryStateSchema,
  workerUpdateSchema,
} from "./Worker";

describe("workerDefinitionSchema", () => {
  it("accepts a valid worker definition", () => {
    const valid: WorkerDefinition = {
      id: "01JTEST000000000000000001",
      name: "eval-builder",
      description: "Builds evaluation tasks",
      projectId: "encoded-project-id",
      sessionId: "session-abc",
      sessionProcessId: "process-xyz",
      tags: ["eval", "builder"],
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-10T00:00:00.000Z",
    };

    const result = workerDefinitionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts null sessionId and sessionProcessId", () => {
    const valid = {
      id: "01JTEST000000000000000001",
      name: "new-worker",
      description: "Not attached yet",
      projectId: "encoded-project-id",
      sessionId: null,
      sessionProcessId: null,
      tags: [],
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-10T00:00:00.000Z",
    };

    const result = workerDefinitionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = workerDefinitionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = workerDefinitionSchema.safeParse({
      id: "01JTEST000000000000000001",
      name: "",
      description: "desc",
      projectId: "pid",
      sessionId: null,
      sessionProcessId: null,
      tags: [],
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("workerRegistryStateSchema", () => {
  it("accepts valid registry state", () => {
    const result = workerRegistryStateSchema.safeParse({
      version: 1,
      workers: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong version", () => {
    const result = workerRegistryStateSchema.safeParse({
      version: 2,
      workers: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("workerCreateSchema", () => {
  it("accepts a valid create payload", () => {
    const result = workerCreateSchema.safeParse({
      name: "eval-builder",
      description: "Builds evaluation tasks",
      projectId: "encoded-project-id",
      sessionId: "session-abc",
      sessionProcessId: "process-xyz",
      tags: ["eval"],
    });
    expect(result.success).toBe(true);
  });

  it("defaults optional fields", () => {
    const result = workerCreateSchema.safeParse({
      name: "eval-builder",
      description: "Builds evaluation tasks",
      projectId: "encoded-project-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBeNull();
      expect(result.data.sessionProcessId).toBeNull();
      expect(result.data.tags).toEqual([]);
    }
  });
});

describe("workerUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = workerUpdateSchema.safeParse({ name: "new-name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty update (all optional)", () => {
    const result = workerUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = workerUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("workerMessageSchema", () => {
  it("accepts a valid message", () => {
    const result = workerMessageSchema.safeParse({ message: "do the thing" });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = workerMessageSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });
});
