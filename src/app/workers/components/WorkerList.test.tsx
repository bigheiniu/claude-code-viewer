/**
 * @vitest-environment jsdom
 */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { WorkerList } from "./WorkerList";

// Setup minimal i18n for tests
i18n.load("en", {
  "workers.page.title": "Workers",
  "workers.list.new_worker": "New Worker",
  "workers.list.empty": "No workers yet",
});
i18n.activate("en");

const renderWithI18n = (ui: ReactElement) => {
  return render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);
};

const mockWorkers = [
  {
    id: "worker-1",
    name: "eval-builder",
    description: "Builds evaluation tasks",
    projectId: "project-1",
    sessionId: null,
    sessionProcessId: null,
    tags: ["eval"],
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
    status: "idle" as const,
    lastActivityAt: null,
  },
  {
    id: "worker-2",
    name: "code-reviewer",
    description: "Reviews pull requests",
    projectId: "project-1",
    sessionId: null,
    sessionProcessId: null,
    tags: [],
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
    status: "running" as const,
    lastActivityAt: "2026-03-10T00:00:00.000Z",
  },
];

describe("WorkerList", () => {
  it("renders worker cards", () => {
    renderWithI18n(
      <WorkerList
        workers={mockWorkers}
        selectedWorkerId={null}
        onSelectWorker={() => {}}
        onCreateWorker={() => {}}
      />,
    );
    expect(screen.getByText("eval-builder")).toBeDefined();
    expect(screen.getByText("code-reviewer")).toBeDefined();
  });

  it("renders empty state when no workers", () => {
    renderWithI18n(
      <WorkerList
        workers={[]}
        selectedWorkerId={null}
        onSelectWorker={() => {}}
        onCreateWorker={() => {}}
      />,
    );
    expect(screen.getByText(/no workers/i)).toBeDefined();
  });
});
