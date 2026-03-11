/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkerCard } from "./WorkerCard";

const mockWorker = {
  id: "worker-1",
  name: "eval-builder",
  description: "Builds evaluation tasks",
  projectId: "project-1",
  sessionId: "session-1",
  sessionProcessId: "process-1",
  tags: ["eval", "builder"],
  createdAt: "2026-03-10T00:00:00.000Z",
  updatedAt: "2026-03-10T00:00:00.000Z",
  status: "running" as const,
  lastActivityAt: "2026-03-10T00:00:00.000Z",
};

describe("WorkerCard", () => {
  it("renders worker name", () => {
    render(
      <WorkerCard worker={mockWorker} isSelected={false} onSelect={() => {}} />,
    );
    expect(screen.getByText("eval-builder")).toBeDefined();
  });

  it("renders status badge", () => {
    render(
      <WorkerCard worker={mockWorker} isSelected={false} onSelect={() => {}} />,
    );
    expect(screen.getByText("running")).toBeDefined();
  });

  it("renders description", () => {
    render(
      <WorkerCard worker={mockWorker} isSelected={false} onSelect={() => {}} />,
    );
    expect(screen.getByText("Builds evaluation tasks")).toBeDefined();
  });

  it("renders tags", () => {
    render(
      <WorkerCard worker={mockWorker} isSelected={false} onSelect={() => {}} />,
    );
    expect(screen.getByText("eval")).toBeDefined();
    expect(screen.getByText("builder")).toBeDefined();
  });
});
